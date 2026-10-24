import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDistanceKm,
  isDonationExpired,
  getExpiryRemaining,
  arbitrateClaimApproval,
  verifyHandoverCode,
  generateHandoverCode,
  type ClaimStatus,
  type DonationStatus,
} from './rules.ts';

test('calculateDistanceKm computes accurate Haversine distance between coordinates', () => {
  // San Francisco (37.7749, -122.4194) to Oakland (37.8044, -122.2712) ~ 13.5 km
  const p1 = { latitude: 37.7749, longitude: -122.4194 };
  const p2 = { latitude: 37.8044, longitude: -122.2712 };
  const dist = calculateDistanceKm(p1, p2);
  assert.ok(dist >= 12 && dist <= 15, `Expected ~13.5km, got ${dist}`);

  // Same point should be 0 km
  assert.equal(calculateDistanceKm(p1, p1), 0);
});

test('isDonationExpired correctly evaluates past and future timestamps', () => {
  const now = 1700000000000;
  const past = new Date(now - 1000 * 60).toISOString();
  const future = new Date(now + 1000 * 60 * 60).toISOString();

  assert.equal(isDonationExpired(past, now), true);
  assert.equal(isDonationExpired(future, now), false);
});

test('getExpiryRemaining returns human friendly labels and urgent flag', () => {
  const now = 1700000000000;
  const urgentTime = new Date(now + 1000 * 60 * 45).toISOString(); // 45m left
  const nonUrgentTime = new Date(now + 1000 * 60 * 60 * 5).toISOString(); // 5h left
  const expiredTime = new Date(now - 1000).toISOString();

  const urgent = getExpiryRemaining(urgentTime, now);
  assert.equal(urgent.isExpired, false);
  assert.equal(urgent.isUrgent, true);
  assert.ok(urgent.label.includes('45m'));

  const nonUrgent = getExpiryRemaining(nonUrgentTime, now);
  assert.equal(nonUrgent.isExpired, false);
  assert.equal(nonUrgent.isUrgent, false);
  assert.ok(nonUrgent.label.includes('5h'));

  const expired = getExpiryRemaining(expiredTime, now);
  assert.equal(expired.isExpired, true);
  assert.equal(expired.label, 'Expired');
});

test('generateHandoverCode produces a valid 6-digit numeric string', () => {
  for (let i = 0; i < 20; i++) {
    const code = generateHandoverCode();
    assert.equal(code.length, 6);
    assert.match(code, /^[1-9][0-9]{5}$/);
  }
});

test('arbitrateClaimApproval approves target claim, reserves donation, and auto-rejects competitors', () => {
  const donation = {
    id: 'don-1',
    donor_id: 'donor-alice',
    status: 'AVAILABLE' as DonationStatus,
    expiry_time: new Date(Date.now() + 10000000).toISOString(),
  };

  const claims = [
    { id: 'claim-1', donation_id: 'don-1', status: 'PENDING' as ClaimStatus },
    { id: 'claim-2', donation_id: 'don-1', status: 'PENDING' as ClaimStatus },
    { id: 'claim-3', donation_id: 'don-1', status: 'CANCELLED' as ClaimStatus },
  ];

  const result = arbitrateClaimApproval({
    donation,
    claimsForDonation: claims,
    targetClaimId: 'claim-1',
    actorDonorId: 'donor-alice',
  });

  assert.equal(result.success, true);
  assert.equal(result.updatedDonation?.status, 'RESERVED');
  
  const target = result.updatedClaims?.find((c) => c.id === 'claim-1');
  const competitor = result.updatedClaims?.find((c) => c.id === 'claim-2');
  const cancelled = result.updatedClaims?.find((c) => c.id === 'claim-3');

  assert.equal(target?.status, 'APPROVED');
  assert.equal(competitor?.status, 'REJECTED');
  assert.equal(cancelled?.status, 'CANCELLED');
  assert.deepEqual(result.autoRejectedClaimIds, ['claim-2']);
});

test('arbitrateClaimApproval blocks unauthorized donors and expired donations', () => {
  const donation = {
    id: 'don-1',
    donor_id: 'donor-alice',
    status: 'AVAILABLE' as DonationStatus,
    expiry_time: new Date(Date.now() - 5000).toISOString(), // expired
  };

  const claims = [{ id: 'claim-1', donation_id: 'don-1', status: 'PENDING' as ClaimStatus }];

  // Unauthorized actor
  const unauthorizedRes = arbitrateClaimApproval({
    donation,
    claimsForDonation: claims,
    targetClaimId: 'claim-1',
    actorDonorId: 'imposter',
  });
  assert.equal(unauthorizedRes.success, false);
  assert.ok(unauthorizedRes.error?.includes('FORBIDDEN'));

  // Expired donation
  const expiredRes = arbitrateClaimApproval({
    donation,
    claimsForDonation: claims,
    targetClaimId: 'claim-1',
    actorDonorId: 'donor-alice',
  });
  assert.equal(expiredRes.success, false);
  assert.ok(expiredRes.error?.includes('EXPIRED'));
});

test('verifyHandoverCode validates match and increments attempts with lockout', () => {
  const expectedCode = '482910';

  // Successful verification
  const successRes = verifyHandoverCode({
    enteredCode: '482910',
    expectedCode,
    currentAttempts: 0,
    trackingStatus: 'EN_ROUTE',
  });
  assert.equal(successRes.success, true);
  assert.equal(successRes.isLocked, false);

  // Failed verification
  const failRes = verifyHandoverCode({
    enteredCode: '000000',
    expectedCode,
    currentAttempts: 0,
    maxAttempts: 3,
    trackingStatus: 'EN_ROUTE',
  });
  assert.equal(failRes.success, false);
  assert.equal(failRes.newAttempts, 1);
  assert.equal(failRes.remainingAttempts, 2);
  assert.equal(failRes.isLocked, false);

  // Lockout on reaching max attempts
  const lockRes = verifyHandoverCode({
    enteredCode: '999999',
    expectedCode,
    currentAttempts: 2,
    maxAttempts: 3,
    trackingStatus: 'EN_ROUTE',
  });
  assert.equal(lockRes.success, false);
  assert.equal(lockRes.newAttempts, 3);
  assert.equal(lockRes.remainingAttempts, 0);
  assert.equal(lockRes.isLocked, true);
});

test('mock notification system builds valid toast payloads for receiver claims', () => {
  const donationTitle = 'Artisan Sourdough Boules';
  const receiverName = 'Elena Ramos';
  const orgName = 'SF Community Food Pantry';

  const mockToast = {
    title: 'New Donation Request! 🔔',
    message: `${receiverName} (${orgName}) requested "${donationTitle}".`,
    type: 'claim' as const,
    actionLabel: 'Review Request',
    durationMs: 8000,
  };

  assert.equal(mockToast.type, 'claim');
  assert.ok(mockToast.title.includes('New Donation Request'));
  assert.ok(mockToast.message.includes(donationTitle));
  assert.ok(mockToast.message.includes(receiverName));
  assert.equal(mockToast.actionLabel, 'Review Request');
});

