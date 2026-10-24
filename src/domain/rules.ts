/**
 * Core domain rules, state machines, and pure calculations for FoodSaver
 * Strict adherence to the FoodSaver Specification v2.0
 */

export type Role = 'DONOR' | 'RECEIVER' | 'RUNNER' | 'ADMIN';

export type DonationStatus = 'AVAILABLE' | 'RESERVED' | 'PICKED_UP' | 'EXPIRED' | 'CANCELLED';

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export type TrackingStatus = 'PENDING' | 'EN_ROUTE' | 'VERIFIED' | 'CANCELLED';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculates Haversine distance in kilometers between two lat/long points
 */
export function calculateDistanceKm(
  point1: LocationCoordinates,
  point2: LocationCoordinates
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const dLon = ((point2.longitude - point1.longitude) * Math.PI) / 180;
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Round to 1 decimal place
}

/**
 * Checks whether an expiry timestamp (ISO string) is expired relative to a reference time
 */
export function isDonationExpired(expiryIso: string, referenceTimeMs: number = Date.now()): boolean {
  const expiryTimeMs = new Date(expiryIso).getTime();
  if (isNaN(expiryTimeMs)) return false;
  return expiryTimeMs <= referenceTimeMs;
}

/**
 * Returns formatted time remaining string or expired state
 */
export function getExpiryRemaining(expiryIso: string, referenceTimeMs: number = Date.now()): {
  isExpired: boolean;
  isUrgent: boolean;
  label: string;
} {
  const expiryMs = new Date(expiryIso).getTime();
  if (isNaN(expiryMs)) {
    return { isExpired: false, isUrgent: false, label: 'Unknown' };
  }
  const diffMs = expiryMs - referenceTimeMs;
  if (diffMs <= 0) {
    return { isExpired: true, isUrgent: false, label: 'Expired' };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  const isUrgent = hours < 2; // Urgent if under 2 hours remaining

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return { isExpired: false, isUrgent: false, label: `${days}d ${hours % 24}h left` };
  }
  if (hours > 0) {
    return { isExpired: false, isUrgent, label: `${hours}h ${minutes}m left` };
  }
  return { isExpired: false, isUrgent: true, label: `${minutes}m left` };
}

/** How long an issued handover OTP remains valid before a fresh one must be requested. */
export const OTP_VALIDITY_MINUTES = 30;

/**
 * Secure 6-digit verification code generation
 */
export function generateHandoverCode(): string {
  // Generates 6 digits between 100000 and 999999
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
}

/** Builds the expiry timestamp for a newly issued handover OTP. */
export function getOtpExpiryIso(fromMs: number = Date.now(), validityMinutes = OTP_VALIDITY_MINUTES): string {
  return new Date(fromMs + validityMinutes * 60 * 1000).toISOString();
}

/** Returns true when an OTP has passed its expiry timestamp. */
export function isOtpExpired(expiryIso?: string, referenceTimeMs: number = Date.now()): boolean {
  if (!expiryIso) return false;
  const expiryMs = new Date(expiryIso).getTime();
  if (isNaN(expiryMs)) return false;
  return expiryMs <= referenceTimeMs;
}

/**
 * Atomic claim approval validator and state transition
 * - Donation must be AVAILABLE and NOT expired
 * - Approves the target claim
 * - Reserves the donation
 * - Auto-rejects all competing PENDING claims for this donation
 */
export function arbitrateClaimApproval<
  TClaim extends { id: string; donation_id: string; status: ClaimStatus },
  TDonation extends { id: string; status: DonationStatus; expiry_time: string; donor_id: string }
>(params: {
  donation: TDonation;
  claimsForDonation: TClaim[];
  targetClaimId: string;
  actorDonorId: string;
  currentTimeMs?: number;
}): {
  success: boolean;
  error?: string;
  updatedDonation?: TDonation;
  updatedClaims?: TClaim[];
  autoRejectedClaimIds?: string[];
} {
  const { donation, claimsForDonation, targetClaimId, actorDonorId, currentTimeMs = Date.now() } = params;

  // Authorization check
  if (donation.donor_id !== actorDonorId) {
    return { success: false, error: 'FORBIDDEN: Only the listing owner can approve claims' };
  }

  // Donation status check
  if (donation.status !== 'AVAILABLE') {
    return { success: false, error: `CONFLICT: Donation is already ${donation.status.toLowerCase()}` };
  }

  // Expiry check
  if (isDonationExpired(donation.expiry_time, currentTimeMs)) {
    return { success: false, error: 'EXPIRED: Listing has expired and cannot be approved' };
  }

  const targetClaim = claimsForDonation.find((c) => c.id === targetClaimId);
  if (!targetClaim) {
    return { success: false, error: 'NOT_FOUND: Claim not found' };
  }

  if (targetClaim.status !== 'PENDING') {
    return { success: false, error: `CONFLICT: Claim is already ${targetClaim.status.toLowerCase()}` };
  }

  // Execute atomic transition
  const autoRejectedClaimIds: string[] = [];
  const updatedClaims = claimsForDonation.map((c) => {
    if (c.id === targetClaimId) {
      return { ...c, status: 'APPROVED' as ClaimStatus };
    }
    if (c.status === 'PENDING') {
      autoRejectedClaimIds.push(c.id);
      return { ...c, status: 'REJECTED' as ClaimStatus };
    }
    return c;
  });

  const updatedDonation = {
    ...donation,
    status: 'RESERVED' as DonationStatus,
  };

  return {
    success: true,
    updatedDonation,
    updatedClaims,
    autoRejectedClaimIds,
  };
}

/**
 * Handover verification logic
 * - Verifies entered 6-digit code against expected code
 * - Enforces max attempts (default 5)
 * - Returns success only on exact match
 */
export function verifyHandoverCode(params: {
  enteredCode: string;
  expectedCode: string;
  currentAttempts: number;
  maxAttempts?: number;
  trackingStatus: TrackingStatus;
  isLocked?: boolean;
  otpExpiresAt?: string;
  otpConsumedAt?: string;
  currentTimeMs?: number;
}): {
  success: boolean;
  isLocked: boolean;
  newAttempts: number;
  remainingAttempts: number;
  error?: string;
} {
  const {
    enteredCode,
    expectedCode,
    currentAttempts,
    maxAttempts = 5,
    trackingStatus,
    isLocked = false,
    otpExpiresAt,
    otpConsumedAt,
    currentTimeMs = Date.now(),
  } = params;

  // A consumed OTP is permanently dead. This is the core one-time-use guarantee:
  // replaying the same code after a successful handover must never succeed.
  if (otpConsumedAt) {
    return {
      success: false,
      isLocked: false,
      newAttempts: currentAttempts,
      remainingAttempts: Math.max(0, maxAttempts - currentAttempts),
      error: 'USED: This one-time handover code has already been used.',
    };
  }

  if (isLocked || currentAttempts >= maxAttempts) {
    return {
      success: false,
      isLocked: true,
      newAttempts: currentAttempts,
      remainingAttempts: 0,
      error: 'LOCKED: Maximum verification attempts exceeded. Please contact support.',
    };
  }

  if (trackingStatus !== 'EN_ROUTE') {
    return {
      success: false,
      isLocked: false,
      newAttempts: currentAttempts,
      remainingAttempts: Math.max(0, maxAttempts - currentAttempts),
      error: `INVALID_STATE: Pickup is currently ${trackingStatus.toLowerCase()}`,
    };
  }

  if (isOtpExpired(otpExpiresAt, currentTimeMs)) {
    return {
      success: false,
      isLocked: false,
      newAttempts: currentAttempts,
      remainingAttempts: Math.max(0, maxAttempts - currentAttempts),
      error: 'EXPIRED_OTP: This one-time code has expired. Ask the receiver or Rescue Runner for a fresh code.',
    };
  }

  const cleanEntered = enteredCode.trim();
  const cleanExpected = expectedCode.trim();

  if (cleanEntered === cleanExpected) {
    return {
      success: true,
      isLocked: false,
      newAttempts: currentAttempts,
      remainingAttempts: maxAttempts - currentAttempts,
    };
  } else {
    const newAttempts = currentAttempts + 1;
    const remaining = Math.max(0, maxAttempts - newAttempts);
    const lockedNow = newAttempts >= maxAttempts;
    return {
      success: false,
      isLocked: lockedNow,
      newAttempts,
      remainingAttempts: remaining,
      error: lockedNow
        ? 'LOCKED: Maximum verification attempts exceeded.'
        : `INCORRECT_CODE: Handover code is incorrect. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    };
  }
}

/**
 * Formats phone number for display only to authorized participants
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return 'Hidden';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 4) return '***';
  return `***-***-${clean.slice(-4)}`;
}
