import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  UserProfile,
  FoodCategory,
  Donation,
  DonationRequest,
  PickupTracking,
  Conversation,
  NotificationItem,
  AuditLog,
  Role,
  PickupMode,
  ToastNotification,
} from '../types/index.ts';
import {
  INITIAL_CATEGORIES,
  INITIAL_USERS,
  INITIAL_DONATIONS,
  INITIAL_CLAIMS,
  INITIAL_TRACKING,
  INITIAL_CONVERSATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
} from './mockData.ts';
import {
  arbitrateClaimApproval,
  verifyHandoverCode,
  generateHandoverCode,
  getOtpExpiryIso,
  isDonationExpired,
} from './rules.ts';
import confetti from 'canvas-confetti';

interface StoreState {
  currentUser: UserProfile | null;
  users: UserProfile[];
  categories: FoodCategory[];
  donations: Donation[];
  claims: DonationRequest[];
  trackingRecords: PickupTracking[];
  conversations: Conversation[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}

interface StoreContextType extends StoreState {
  setCurrentUser: (user: UserProfile | null) => void;
  loginAs: (userId: string) => void;
  signUp: (data: {
    full_name: string;
    email: string;
    phone_number: string;
    organization_name?: string;
    role: 'DONOR' | 'RECEIVER' | 'RUNNER'; // ADMIN NEVER allowed here
    address: string;
    city: string;
  }) => { success: boolean; error?: string };
  logout: () => void;
  createDonation: (data: {
    title: string;
    description: string;
    category_id: string;
    quantity: string;
    quantity_unit: string;
    cooked_time?: string;
    expiry_time: string;
    pickup_address: string;
    city: string;
    state?: string;
    pincode?: string;
    latitude: number;
    longitude: number;
    image_url?: string;
    is_emergency?: boolean;
    storage_notes?: string;
  }) => { success: boolean; donationId?: string; error?: string };
  cancelDonation: (donationId: string) => { success: boolean; error?: string };
  createClaim: (
    donationId: string,
    message?: string,
    pickupMode?: PickupMode
  ) => { success: boolean; error?: string };
  approveClaim: (claimId: string) => { success: boolean; error?: string };
  rejectClaim: (claimId: string) => { success: boolean; error?: string };
  cancelClaim: (claimId: string) => { success: boolean; error?: string };
  startPickup: (params: {
    donationRequestId: string;
    pickupPersonName: string;
    pickupPhone: string;
    plannedTime: string;
  }) => { success: boolean; trackingId?: string; error?: string };
  acceptRunnerRun: (claimId: string) => { success: boolean; trackingId?: string; error?: string };
  regenerateHandoverOtp: (trackingId: string) => { success: boolean; code?: string; error?: string };
  updateReceiverLocation: (trackingId: string, lat: number, lng: number) => void;
  updateCurrentLocation: (lat: number, lng: number) => void;
  verifyHandover: (trackingId: string, code: string) => {
    success: boolean;
    isLocked?: boolean;
    remainingAttempts?: number;
    error?: string;
  };
  sendMessage: (donationId: string, otherUserId: string, text: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toggleUserStatus: (userId: string) => void;
  changeUserRole: (userId: string, newRole: Role) => void;
  resetToDemoData: () => void;
  unreadNotificationsCount: number;
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id' | 'timestamp'> & { id?: string }) => string;
  dismissToast: (id: string) => void;
  requestedReviewDonationId: string | null;
  setRequestedReviewDonationId: (id: string | null) => void;
  triggerMockRequestToast: (donationId?: string) => void;
}

const STORAGE_KEY = 'foodsaver_app_state_v3';

const StoreContext = createContext<StoreContextType | null>(null);

function loadInitialState(): StoreState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure currentUser points to one of the users
      const current = parsed.currentUser || parsed.users[0] || null;
      return {
        ...parsed,
        currentUser: current,
      };
    }
  } catch (e) {
    console.warn('Could not load stored state, initializing defaults', e);
  }

  return {
    currentUser: INITIAL_USERS[2], // Default to Elena (RECEIVER) for discovery journey
    users: INITIAL_USERS,
    categories: INITIAL_CATEGORIES,
    donations: INITIAL_DONATIONS,
    claims: INITIAL_CLAIMS,
    trackingRecords: INITIAL_TRACKING,
    conversations: INITIAL_CONVERSATIONS,
    notifications: INITIAL_NOTIFICATIONS,
    auditLogs: INITIAL_AUDIT_LOGS,
  };
}

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StoreState>(loadInitialState);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [requestedReviewDonationId, setRequestedReviewDonationId] = useState<string | null>(null);

  const addToast = (toast: Omit<ToastNotification, 'id' | 'timestamp'> & { id?: string }) => {
    const id = toast.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = {
      ...toast,
      id,
      timestamp: new Date().toISOString(),
    };
    setToasts((prev) => [newToast, ...prev.filter((t) => t.id !== id).slice(0, 4)]);
    return id;
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const triggerMockRequestToast = (donationId?: string) => {
    const targetDonation = donationId
      ? state.donations.find((d) => d.id === donationId)
      : state.donations[0];
    const receiver = state.users.find((u) => u.role === 'RECEIVER') || state.currentUser;
    const title = targetDonation ? targetDonation.title : 'Fresh Artisan Bakery Surplus';
    const receiverName = receiver?.full_name || 'Elena Rostova (SF Food Rescue)';
    const donId = targetDonation ? targetDonation.id : state.donations[0]?.id;

    addToast({
      id: `toast-mock-${Date.now()}`,
      title: 'New Claim Request! 🔔',
      message: `${receiverName} requested "${title}". Tap to review and approve pickup.`,
      type: 'claim',
      actionLabel: 'Review Request',
      onAction: () => {
        if (donId) setRequestedReviewDonationId(donId);
      },
      durationMs: 8000,
    });
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to persist state', e);
    }
  }, [state]);

  const setCurrentUser = (user: UserProfile | null) => {
    setState((prev) => ({ ...prev, currentUser: user }));
  };

  const loginAs = (userId: string) => {
    const found = state.users.find((u) => u.id === userId);
    if (found) {
      if (!found.is_active) {
        alert('This account is currently suspended. Please contact platform support.');
        return;
      }
      setCurrentUser(found);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const signUp = (data: {
    full_name: string;
    email: string;
    phone_number: string;
    organization_name?: string;
    role: 'DONOR' | 'RECEIVER' | 'RUNNER';
    address: string;
    city: string;
  }) => {
    // Validate email uniqueness
    const exists = state.users.some((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (exists) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    if (!data.full_name.trim() || !data.email.trim() || !data.phone_number.trim()) {
      return { success: false, error: 'Please provide all required fields.' };
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      full_name: data.full_name.trim(),
      email: data.email.trim().toLowerCase(),
      phone_number: data.phone_number.trim(),
      organization_name: data.organization_name?.trim() || undefined,
      role: data.role,
      address: data.address.trim(),
      city: data.city.trim() || 'San Francisco',
      latitude: 37.7749 + (Math.random() - 0.5) * 0.04,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.04,
      is_verified: false,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      users: [newUser, ...prev.users],
      currentUser: newUser,
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          actor_id: newUser.id,
          actor_name: newUser.full_name,
          action: 'USER_REGISTERED',
          target_type: 'USER',
          target_id: newUser.id,
          details: `Registered new account with role ${newUser.role}`,
          created_at: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));

    return { success: true };
  };

  const createDonation = (data: {
    title: string;
    description: string;
    category_id: string;
    quantity: string;
    quantity_unit: string;
    cooked_time?: string;
    expiry_time: string;
    pickup_address: string;
    city: string;
    state?: string;
    pincode?: string;
    latitude: number;
    longitude: number;
    image_url?: string;
    is_emergency?: boolean;
    storage_notes?: string;
  }) => {
    if (!state.currentUser) {
      return { success: false, error: 'You must be signed in to post a donation.' };
    }
    if (state.currentUser.role !== 'DONOR') {
      return { success: false, error: 'Only registered DONORS can create food donations.' };
    }
    if (!state.currentUser.is_active) {
      return { success: false, error: 'Your account is currently suspended.' };
    }
    if (isDonationExpired(data.expiry_time)) {
      return { success: false, error: 'Expiry time must be in the future.' };
    }

    const defaultImages: Record<string, string> = {
      'cat-bakery': '/src/assets/images/category_bakery_fresh_1792770776700.jpg',
      'cat-prepared': '/src/assets/images/category_prepared_meals_1792770777342.jpg',
      'cat-produce': '/src/assets/images/category_produce_crates_1792770776817.jpg',
    };

    const newDonation: Donation = {
      id: `don-${Date.now()}`,
      donor_id: state.currentUser.id,
      donor_name: state.currentUser.full_name,
      donor_org: state.currentUser.organization_name,
      title: data.title.trim(),
      description: data.description.trim(),
      category_id: data.category_id,
      quantity: data.quantity.trim(),
      quantity_unit: data.quantity_unit.trim(),
      cooked_time: data.cooked_time,
      expiry_time: data.expiry_time,
      pickup_address: data.pickup_address.trim(),
      city: data.city.trim() || 'San Francisco',
      state: data.state || 'CA',
      pincode: data.pincode || '94103',
      latitude: data.latitude,
      longitude: data.longitude,
      image_url:
        data.image_url?.trim() ||
        defaultImages[data.category_id] ||
        '/src/assets/images/hero_surplus_food_1792770776138.jpg',
      status: 'AVAILABLE',
      is_emergency: !!data.is_emergency,
      storage_notes: data.storage_notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      donations: [newDonation, ...prev.donations],
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          actor_id: prev.currentUser!.id,
          actor_name: prev.currentUser!.full_name,
          action: 'DONATION_CREATED',
          target_type: 'DONATION',
          target_id: newDonation.id,
          details: `Listed "${newDonation.title}" with quantity ${newDonation.quantity} ${newDonation.quantity_unit}`,
          created_at: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));

    return { success: true, donationId: newDonation.id };
  };

  const cancelDonation = (donationId: string) => {
    if (!state.currentUser) return { success: false, error: 'Unauthenticated' };
    const donation = state.donations.find((d) => d.id === donationId);
    if (!donation) return { success: false, error: 'Donation not found' };

    if (donation.donor_id !== state.currentUser.id && state.currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized to cancel this donation' };
    }

    // Check if an active pickup is en route
    const activeTracking = state.trackingRecords.find(
      (t) => t.donation_id === donationId && t.pickup_status === 'EN_ROUTE'
    );
    if (activeTracking) {
      return { success: false, error: 'Cannot cancel donation while receiver is actively en route.' };
    }

    setState((prev) => ({
      ...prev,
      donations: prev.donations.map((d) => (d.id === donationId ? { ...d, status: 'CANCELLED' } : d)),
      claims: prev.claims.map((c) =>
        c.donation_id === donationId && c.status === 'PENDING' ? { ...c, status: 'CANCELLED' } : c
      ),
    }));

    return { success: true };
  };

  const createClaim = (donationId: string, message?: string, pickupMode: PickupMode = 'SELF') => {
    if (!state.currentUser) {
      return { success: false, error: 'Please sign in to claim food.' };
    }
    if (state.currentUser.role !== 'RECEIVER') {
      return { success: false, error: 'Only RECEIVERS can submit claims. Please switch or sign in with a receiver account.' };
    }
    if (!state.currentUser.is_active) {
      return { success: false, error: 'Your account is suspended.' };
    }

    const donation = state.donations.find((d) => d.id === donationId);
    if (!donation) return { success: false, error: 'Donation not found' };
    if (donation.status !== 'AVAILABLE') {
      return { success: false, error: `This donation is no longer available (${donation.status.toLowerCase()}).` };
    }
    if (isDonationExpired(donation.expiry_time)) {
      return { success: false, error: 'This listing has expired and can no longer be claimed.' };
    }

    // Check duplicate pending or approved claim by this receiver
    const existing = state.claims.find(
      (c) => c.donation_id === donationId && c.receiver_id === state.currentUser!.id && (c.status === 'PENDING' || c.status === 'APPROVED')
    );
    if (existing) {
      return { success: false, error: 'You already have an active claim for this donation.' };
    }

    const newClaim: DonationRequest = {
      id: `req-${Date.now()}`,
      donation_id: donationId,
      receiver_id: state.currentUser.id,
      receiver_name: state.currentUser.full_name,
      receiver_org: state.currentUser.organization_name,
      receiver_phone: state.currentUser.phone_number,
      request_message: message?.trim() || undefined,
      status: 'PENDING',
      pickup_mode: pickupMode,
      requested_at: new Date().toISOString(),
    };

    const runnerNote =
      pickupMode === 'RUNNER'
        ? ' They also requested a Rescue Runner for collection and delivery.'
        : '';

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: donation.donor_id,
      title: pickupMode === 'RUNNER' ? 'New Claim + Runner Request' : 'New Claim Received',
      message: `${state.currentUser.full_name}${
        state.currentUser.organization_name ? ` (${state.currentUser.organization_name})` : ''
      } requested "${donation.title}".${runnerNote}`,
      type: 'CLAIM_RECEIVED',
      link_type: 'claims',
      link_id: donation.id,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      claims: [newClaim, ...prev.claims],
      notifications: [newNotif, ...prev.notifications],
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          actor_id: prev.currentUser!.id,
          actor_name: prev.currentUser!.full_name,
          action: 'CLAIM_SUBMITTED',
          target_type: 'DONATION_REQUEST',
          target_id: newClaim.id,
          details: `Submitted claim for "${donation.title}"`,
          created_at: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));

    // Toast notification system replacing modal-only notifications:
    // 1) Feedback toast confirming claim submission
    addToast({
      title: pickupMode === 'RUNNER' ? 'Claim + Runner Request Submitted!' : 'Claim Request Submitted!',
      message:
        pickupMode === 'RUNNER'
          ? `Your request for "${donation.title}" was sent to ${donation.donor_org || donation.donor_name}. Once approved, a Rescue Runner can accept the collection.`
          : `Your request for "${donation.title}" was submitted to ${donation.donor_org || donation.donor_name}.`,
      type: 'success',
      durationMs: 6000,
    });

    // 2) Live mock notification simulating the incoming claim alert on the donor side
    addToast({
      id: `toast-claim-${newClaim.id}`,
      title: 'New Donation Request! 🔔',
      message: `${state.currentUser.full_name}${
        state.currentUser.organization_name ? ` (${state.currentUser.organization_name})` : ''
      } requested "${donation.title}".`,
      type: 'claim',
      actionLabel: 'Review Request',
      onAction: () => setRequestedReviewDonationId(donation.id),
      durationMs: 8000,
    });

    return { success: true };
  };

  const approveClaim = (claimId: string) => {
    if (!state.currentUser) return { success: false, error: 'Unauthenticated' };
    const claim = state.claims.find((c) => c.id === claimId);
    if (!claim) return { success: false, error: 'Claim not found' };

    const donation = state.donations.find((d) => d.id === claim.donation_id);
    if (!donation) return { success: false, error: 'Donation not found' };

    const relatedClaims = state.claims.filter((c) => c.donation_id === donation.id);

    // Call domain state machine for atomic arbitration
    const arbitration = arbitrateClaimApproval({
      donation,
      claimsForDonation: relatedClaims,
      targetClaimId: claimId,
      actorDonorId: state.currentUser.id,
    });

    if (!arbitration.success || !arbitration.updatedDonation || !arbitration.updatedClaims) {
      return { success: false, error: arbitration.error || 'Failed to approve claim' };
    }

    // Build notifications for approved receiver & auto-rejected competing receivers
    const newNotifications: NotificationItem[] = [];

    const needsRunner = claim.pickup_mode === 'RUNNER';

    // Notification for winner
    newNotifications.push({
      id: `notif-${Date.now()}-win`,
      user_id: claim.receiver_id,
      title: 'Claim Approved! 🎉',
      message: needsRunner
        ? `${state.currentUser.full_name} approved your claim for "${donation.title}". We are matching a Rescue Runner to collect and deliver it.`
        : `${state.currentUser.full_name} approved your claim for "${donation.title}". Start pickup when you are ready to collect.`,
      type: 'CLAIM_APPROVED',
      link_type: 'requests',
      link_id: claim.id,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    // A runner-mode claim becomes an open dispatch job for every Rescue Runner.
    if (needsRunner) {
      state.users
        .filter((u) => u.role === 'RUNNER' && u.is_active)
        .forEach((runner) => {
          newNotifications.push({
            id: `notif-${Date.now()}-runner-${runner.id}`,
            user_id: runner.id,
            title: 'New Rescue Run Available',
            message: `A receiver needs a Rescue Runner for "${donation.title}" from ${
              donation.donor_org || donation.donor_name
            }.`,
            type: 'RUNNER_JOB_AVAILABLE',
            link_type: 'runner',
            link_id: claim.id,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        });
    }

    // Notifications for auto-rejected competitors
    arbitration.autoRejectedClaimIds?.forEach((rejId, idx) => {
      const rejClaim = relatedClaims.find((c) => c.id === rejId);
      if (rejClaim) {
        newNotifications.push({
          id: `notif-${Date.now()}-rej-${idx}`,
          user_id: rejClaim.receiver_id,
          title: 'Donation Reserved',
          message: `Another claim was approved for "${donation.title}". Your claim was released.`,
          type: 'CLAIM_COMPETING_REJECTED',
          link_type: 'requests',
          link_id: rejClaim.id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    });

    setState((prev) => {
      // Replace updated donation
      const newDonations = prev.donations.map((d) =>
        d.id === arbitration.updatedDonation!.id ? arbitration.updatedDonation! : d
      );

      // Replace updated claims
      const updatedClaimsMap = new Map(arbitration.updatedClaims!.map((c) => [c.id, c]));
      const newClaims = prev.claims.map((c) => (updatedClaimsMap.has(c.id) ? updatedClaimsMap.get(c.id)! : c));

      // Deliberately do NOT issue the handover OTP here. The code is generated only
      // when collection actually starts, so it is fresh and single-use at handover time.
      return {
        ...prev,
        donations: newDonations,
        claims: newClaims,
        notifications: [...newNotifications, ...prev.notifications],
        auditLogs: [
          {
            id: `audit-${Date.now()}`,
            actor_id: prev.currentUser!.id,
            actor_name: prev.currentUser!.full_name,
            action: 'CLAIM_APPROVED_ATOMIC',
            target_type: 'DONATION',
            target_id: donation.id,
            details: `Approved claim ${claimId} and atomically rejected ${arbitration.autoRejectedClaimIds?.length || 0} competing claim(s).`,
            created_at: new Date().toISOString(),
          },
          ...prev.auditLogs,
        ],
      };
    });

    return { success: true };
  };

  const rejectClaim = (claimId: string) => {
    if (!state.currentUser) return { success: false, error: 'Unauthenticated' };
    const claim = state.claims.find((c) => c.id === claimId);
    if (!claim) return { success: false, error: 'Claim not found' };

    const donation = state.donations.find((d) => d.id === claim.donation_id);
    if (!donation || donation.donor_id !== state.currentUser.id) {
      return { success: false, error: 'Forbidden: Only the donor can reject claims' };
    }

    setState((prev) => ({
      ...prev,
      claims: prev.claims.map((c) => (c.id === claimId ? { ...c, status: 'REJECTED' } : c)),
      notifications: [
        {
          id: `notif-${Date.now()}`,
          user_id: claim.receiver_id,
          title: 'Claim Declined',
          message: `Your claim for "${donation.title}" was declined by the donor.`,
          type: 'CLAIM_REJECTED',
          link_type: 'requests',
          link_id: claim.id,
          is_read: false,
          created_at: new Date().toISOString(),
        },
        ...prev.notifications,
      ],
    }));

    return { success: true };
  };

  const cancelClaim = (claimId: string) => {
    if (!state.currentUser) return { success: false, error: 'Unauthenticated' };
    const claim = state.claims.find((c) => c.id === claimId);
    if (!claim || claim.receiver_id !== state.currentUser.id) {
      return { success: false, error: 'Unauthorized' };
    }

    const wasApproved = claim.status === 'APPROVED';

    setState((prev) => {
      const updatedClaims = prev.claims.map((c) =>
        c.id === claimId
          ? { ...c, status: 'CANCELLED' as const, runner_id: undefined, runner_name: undefined }
          : c
      );
      let updatedDonations = prev.donations;

      // If approved claim cancelled, release donation back to AVAILABLE
      if (wasApproved) {
        updatedDonations = prev.donations.map((d) =>
          d.id === claim.donation_id && d.status === 'RESERVED' ? { ...d, status: 'AVAILABLE' as const } : d
        );
      }

      // Kill any issued OTP and stop an in-progress tracking record.
      const updatedTracking = prev.trackingRecords.map((t) =>
        t.donation_request_id === claimId && t.pickup_status === 'EN_ROUTE'
          ? {
              ...t,
              pickup_status: 'CANCELLED' as const,
              otp_consumed_at: new Date().toISOString(),
            }
          : t
      );

      return {
        ...prev,
        claims: updatedClaims,
        donations: updatedDonations,
        trackingRecords: updatedTracking,
      };
    });

    return { success: true };
  };

  const startPickup = (params: {
    donationRequestId: string;
    pickupPersonName: string;
    pickupPhone: string;
    plannedTime: string;
  }) => {
    if (!state.currentUser) return { success: false, error: 'Unauthenticated' };
    const claim = state.claims.find((c) => c.id === params.donationRequestId);
    if (!claim) return { success: false, error: 'Claim not found' };
    if (claim.receiver_id !== state.currentUser.id) {
      return { success: false, error: 'Only the approved receiver can start pickup' };
    }
    if (claim.status !== 'APPROVED') {
      return { success: false, error: `Claim is not approved (currently ${claim.status.toLowerCase()})` };
    }
    if (claim.pickup_mode === 'RUNNER') {
      return {
        success: false,
        error: 'This rescue is assigned to a Rescue Runner. The runner will start pickup and receive the one-time code.',
      };
    }

    const donation = state.donations.find((d) => d.id === claim.donation_id);
    if (!donation) return { success: false, error: 'Donation not found' };

    // Check if tracking record already exists
    const existing = state.trackingRecords.find((t) => t.donation_request_id === claim.id);
    if (existing) {
      return { success: true, trackingId: existing.id };
    }

    // Generate a fresh single-use 6-digit OTP for this pickup.
    const now = new Date();
    const verificationCode = generateHandoverCode();

    const newTracking: PickupTracking = {
      id: `trk-${Date.now()}`,
      donation_request_id: claim.id,
      donation_id: donation.id,
      receiver_id: state.currentUser.id,
      donor_id: donation.donor_id,
      pickup_person_name: params.pickupPersonName.trim() || state.currentUser.full_name,
      pickup_phone: params.pickupPhone.trim() || state.currentUser.phone_number,
      planned_pickup_time: params.plannedTime,
      verification_code: verificationCode,
      verification_attempts: 0,
      max_attempts: 5,
      is_locked: false,
      otp_holder_id: state.currentUser.id,
      otp_issued_at: now.toISOString(),
      otp_expires_at: getOtpExpiryIso(now.getTime()),
      pickup_status: 'EN_ROUTE',
      receiver_latitude: state.currentUser.latitude || 37.765,
      receiver_longitude: state.currentUser.longitude || -122.418,
      last_location_update: now.toISOString(),
      created_at: now.toISOString(),
    };

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: donation.donor_id,
      title: 'Receiver is En Route! 🚚',
      message: `${state.currentUser.full_name} has started pickup for "${donation.title}". Planned arrival: ${params.plannedTime}.`,
      type: 'PICKUP_STARTED',
      link_type: 'tracking',
      link_id: newTracking.id,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      trackingRecords: [newTracking, ...prev.trackingRecords],
      notifications: [notif, ...prev.notifications],
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          actor_id: prev.currentUser!.id,
          actor_name: prev.currentUser!.full_name,
          action: 'PICKUP_STARTED',
          target_type: 'PICKUP_TRACKING',
          target_id: newTracking.id,
          details: `Receiver started transit for donation ${donation.id}. Single-use handover OTP issued.`,
          created_at: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));

    return { success: true, trackingId: newTracking.id };
  };

  /**
   * A Rescue Runner accepts an approved runner-mode claim. Accepting the run
   * creates the tracking record and issues the single-use OTP to the runner.
   */
  const acceptRunnerRun = (claimId: string) => {
    if (!state.currentUser) return { success: false, error: 'Unauthenticated' };
    if (state.currentUser.role !== 'RUNNER') {
      return { success: false, error: 'Only Rescue Runners can accept dispatch runs.' };
    }
    if (!state.currentUser.is_active) {
      return { success: false, error: 'Your Rescue Runner account is suspended.' };
    }

    const claim = state.claims.find((c) => c.id === claimId);
    if (!claim) return { success: false, error: 'Run request not found' };
    if (claim.status !== 'APPROVED') {
      return { success: false, error: 'This run is not approved yet.' };
    }
    if (claim.pickup_mode !== 'RUNNER') {
      return { success: false, error: 'This receiver is collecting the food themselves.' };
    }
    if (claim.runner_id && claim.runner_id !== state.currentUser.id) {
      return { success: false, error: 'Another Rescue Runner has already accepted this run.' };
    }

    const donation = state.donations.find((d) => d.id === claim.donation_id);
    if (!donation) return { success: false, error: 'Donation not found' };

    const existing = state.trackingRecords.find((t) => t.donation_request_id === claim.id);
    if (existing) {
      return { success: true, trackingId: existing.id };
    }

    const now = new Date();
    const newTracking: PickupTracking = {
      id: `trk-${Date.now()}`,
      donation_request_id: claim.id,
      donation_id: donation.id,
      receiver_id: claim.receiver_id,
      donor_id: donation.donor_id,
      pickup_person_name: state.currentUser.full_name,
      pickup_phone: state.currentUser.phone_number,
      planned_pickup_time: 'Runner en route',
      verification_code: generateHandoverCode(),
      verification_attempts: 0,
      max_attempts: 5,
      is_locked: false,
      otp_holder_id: state.currentUser.id,
      otp_issued_at: now.toISOString(),
      otp_expires_at: getOtpExpiryIso(now.getTime()),
      pickup_status: 'EN_ROUTE',
      receiver_latitude: state.currentUser.latitude || 37.765,
      receiver_longitude: state.currentUser.longitude || -122.418,
      last_location_update: now.toISOString(),
      created_at: now.toISOString(),
    };

    const notifications: NotificationItem[] = [
      {
        id: `notif-${Date.now()}-runner-assigned`,
        user_id: claim.receiver_id,
        title: 'Rescue Runner Assigned 🛵',
        message: `${state.currentUser.full_name} is collecting "${donation.title}" from ${
          donation.donor_org || donation.donor_name
        } and delivering it to you.`,
        type: 'RUNNER_ASSIGNED',
        link_type: 'tracking',
        link_id: newTracking.id,
        is_read: false,
        created_at: now.toISOString(),
      },
      {
        id: `notif-${Date.now()}-runner-enroute`,
        user_id: donation.donor_id,
        title: 'Rescue Runner En Route',
        message: `${state.currentUser.full_name} accepted the rescue run for "${donation.title}" on behalf of ${
          claim.receiver_org || claim.receiver_name
        }.`,
        type: 'PICKUP_STARTED',
        link_type: 'tracking',
        link_id: newTracking.id,
        is_read: false,
        created_at: now.toISOString(),
      },
    ];

    setState((prev) => ({
      ...prev,
      claims: prev.claims.map((c) =>
        c.id === claim.id
          ? {
              ...c,
              runner_id: state.currentUser!.id,
              runner_name: state.currentUser!.full_name,
              runner_phone: state.currentUser!.phone_number,
              runner_assigned_at: now.toISOString(),
            }
          : c
      ),
      trackingRecords: [newTracking, ...prev.trackingRecords],
      notifications: [...notifications, ...prev.notifications],
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          actor_id: state.currentUser!.id,
          actor_name: state.currentUser!.full_name,
          action: 'RUNNER_RUN_ACCEPTED',
          target_type: 'PICKUP_TRACKING',
          target_id: newTracking.id,
          details: `Rescue Runner accepted claim ${claim.id}. Single-use handover OTP issued to runner.`,
          created_at: now.toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));

    return { success: true, trackingId: newTracking.id };
  };

  /**
   * Rotates the handover OTP. Only the current OTP holder may do this, and a
   * locked record cannot bypass the attempt limit by requesting a new code.
   */
  const regenerateHandoverOtp = (trackingId: string) => {
    if (!state.currentUser) return { success: false, error: 'Unauthenticated' };
    const tracking = state.trackingRecords.find((t) => t.id === trackingId);
    if (!tracking) return { success: false, error: 'Tracking record not found' };
    if (tracking.pickup_status !== 'EN_ROUTE') {
      return { success: false, error: 'A new code can only be issued while the pickup is en route.' };
    }
    if (tracking.is_locked) {
      return { success: false, error: 'This handover is locked after too many incorrect attempts.' };
    }
    if (tracking.otp_holder_id && tracking.otp_holder_id !== state.currentUser.id) {
      return { success: false, error: 'Only the receiver or assigned Rescue Runner can refresh this code.' };
    }

    const now = new Date();
    const code = generateHandoverCode();

    setState((prev) => ({
      ...prev,
      trackingRecords: prev.trackingRecords.map((t) =>
        t.id === trackingId
          ? {
              ...t,
              verification_code: code,
              verification_attempts: 0,
              is_locked: false,
              otp_issued_at: now.toISOString(),
              otp_expires_at: getOtpExpiryIso(now.getTime()),
              otp_consumed_at: undefined,
            }
          : t
      ),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          actor_id: prev.currentUser!.id,
          actor_name: prev.currentUser!.full_name,
          action: 'HANDOVER_OTP_ROTATED',
          target_type: 'PICKUP_TRACKING',
          target_id: trackingId,
          details: 'Issued a fresh single-use handover OTP. Previous code is now invalid.',
          created_at: now.toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));

    return { success: true, code };
  };

  const updateReceiverLocation = (trackingId: string, lat: number, lng: number) => {
    setState((prev) => ({
      ...prev,
      trackingRecords: prev.trackingRecords.map((t) =>
        t.id === trackingId
          ? {
              ...t,
              receiver_latitude: lat,
              receiver_longitude: lng,
              last_location_update: new Date().toISOString(),
            }
          : t
      ),
    }));
  };

  /**
   * Persists the device's precise coordinates onto the signed-in profile so
   * distances, the radius circle, and map centering all use the real location.
   */
  const updateCurrentLocation = (lat: number, lng: number) => {
    setState((prev) => {
      if (!prev.currentUser) return prev;
      return {
        ...prev,
        currentUser: { ...prev.currentUser, latitude: lat, longitude: lng },
        users: prev.users.map((u) =>
          u.id === prev.currentUser!.id ? { ...u, latitude: lat, longitude: lng } : u
        ),
      };
    });
  };

  const verifyHandover = (trackingOrDonationId: string, enteredCode: string) => {
    if (!state.currentUser) return { success: false, error: 'Unauthenticated' };
    const tracking = state.trackingRecords.find(
      (t) => t.id === trackingOrDonationId || t.donation_id === trackingOrDonationId
    );
    if (!tracking) return { success: false, error: 'Tracking record not found' };

    // Donor participant authorization
    if (tracking.donor_id !== state.currentUser.id && state.currentUser.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized: Only the listing donor can verify handover.' };
    }

    const verificationResult = verifyHandoverCode({
      enteredCode,
      expectedCode: tracking.verification_code,
      currentAttempts: tracking.verification_attempts,
      maxAttempts: tracking.max_attempts,
      trackingStatus: tracking.pickup_status,
      isLocked: tracking.is_locked,
      otpExpiresAt: tracking.otp_expires_at,
      otpConsumedAt: tracking.otp_consumed_at,
    });

    if (!verificationResult.success) {
      // Update failed attempts and lock status
      setState((prev) => ({
        ...prev,
        trackingRecords: prev.trackingRecords.map((t) =>
          t.id === tracking.id
            ? {
                ...t,
                verification_attempts: verificationResult.newAttempts,
                is_locked: verificationResult.isLocked,
              }
            : t
        ),
      }));

      return {
        success: false,
        isLocked: verificationResult.isLocked,
        remainingAttempts: verificationResult.remainingAttempts,
        error: verificationResult.error,
      };
    }

    // Success! Verified!
    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D97706', '#2D6A4F', '#FAF7F2', '#FEF3C7'],
      });
    } catch {
      // ignore
    }

    const donation = state.donations.find((d) => d.id === tracking.donation_id);

    setState((prev) => ({
      ...prev,
      trackingRecords: prev.trackingRecords.map((t) =>
        t.id === tracking.id
          ? {
              ...t,
              pickup_status: 'VERIFIED' as const,
              // Consuming the OTP is what makes it one-time. The same digits can never verify again.
              otp_consumed_at: new Date().toISOString(),
            }
          : t
      ),
      claims: prev.claims.map((c) =>
        c.id === tracking.donation_request_id ? { ...c, status: 'COMPLETED' as const, completed_at: new Date().toISOString() } : c
      ),
      donations: prev.donations.map((d) =>
        d.id === tracking.donation_id ? { ...d, status: 'PICKED_UP' as const } : d
      ),
      notifications: [
        {
          id: `notif-${Date.now()}-done`,
          user_id: tracking.receiver_id,
          title: 'Handover Verified! 🎉',
          message: `The donor verified your pickup for "${donation?.title || 'Food Donation'}". Thank you for rescuing surplus food!`,
          type: 'PICKUP_VERIFIED',
          link_type: 'requests',
          link_id: tracking.donation_request_id,
          is_read: false,
          created_at: new Date().toISOString(),
        },
        ...(tracking.otp_holder_id && tracking.otp_holder_id !== tracking.receiver_id
          ? [
              {
                id: `notif-${Date.now()}-runner-done`,
                user_id: tracking.otp_holder_id,
                title: 'Rescue Delivered & Verified 🎉',
                message: `The donor verified the one-time code for "${donation?.title || 'Food Donation'}". Your rescue run is complete.`,
                type: 'PICKUP_VERIFIED' as const,
                link_type: 'runner' as const,
                link_id: tracking.donation_request_id,
                is_read: false,
                created_at: new Date().toISOString(),
              },
            ]
          : []),
        ...prev.notifications,
      ],
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          actor_id: prev.currentUser!.id,
          actor_name: prev.currentUser!.full_name,
          action: 'HANDOVER_VERIFIED',
          target_type: 'DONATION',
          target_id: tracking.donation_id,
          details: `Verified single-use 6-digit OTP. Code consumed, claim completed, donation marked PICKED_UP.`,
          created_at: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));

    return { success: true };
  };

  const sendMessage = (donationId: string, otherUserId: string, text: string) => {
    if (!state.currentUser || !text.trim()) return;

    setState((prev) => {
      // Find or create conversation
      const existingConv = prev.conversations.find(
        (c) =>
          c.donation_id === donationId &&
          ((c.donor_id === prev.currentUser!.id && c.receiver_id === otherUserId) ||
            (c.receiver_id === prev.currentUser!.id && c.donor_id === otherUserId))
      );

      const newMsg = {
        id: `msg-${Date.now()}`,
        conversation_id: existingConv ? existingConv.id : `conv-${Date.now()}`,
        sender_id: prev.currentUser!.id,
        sender_name: prev.currentUser!.full_name,
        text: text.trim(),
        created_at: new Date().toISOString(),
      };

      if (existingConv) {
        return {
          ...prev,
          conversations: prev.conversations.map((c) =>
            c.id === existingConv.id
              ? {
                  ...c,
                  updated_at: new Date().toISOString(),
                  messages: [...c.messages, newMsg],
                }
              : c
          ),
        };
      } else {
        const newConv: Conversation = {
          id: `conv-${Date.now()}`,
          donation_id: donationId,
          donor_id: prev.currentUser!.role === 'DONOR' ? prev.currentUser!.id : otherUserId,
          receiver_id: prev.currentUser!.role === 'RECEIVER' ? prev.currentUser!.id : otherUserId,
          updated_at: new Date().toISOString(),
          messages: [newMsg],
        };
        return {
          ...prev,
          conversations: [newConv, ...prev.conversations],
        };
      }
    });
  };

  const markNotificationRead = (id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    }));
  };

  const markAllNotificationsRead = () => {
    if (!state.currentUser) return;
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.user_id === prev.currentUser!.id ? { ...n, is_read: true } : n
      ),
    }));
  };

  const toggleUserStatus = (userId: string) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u)),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          actor_id: prev.currentUser?.id || 'admin',
          actor_name: prev.currentUser?.full_name || 'Admin',
          action: 'TOGGLE_USER_STATUS',
          target_type: 'USER',
          target_id: userId,
          details: `Updated active state for user ${userId}`,
          created_at: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const changeUserRole = (userId: string, newRole: Role) => {
    setState((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      auditLogs: [
        {
          id: `audit-${Date.now()}`,
          actor_id: prev.currentUser?.id || 'admin',
          actor_name: prev.currentUser?.full_name || 'Admin',
          action: 'CHANGE_USER_ROLE',
          target_type: 'USER',
          target_id: userId,
          details: `Changed role to ${newRole}`,
          created_at: new Date().toISOString(),
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const resetToDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      currentUser: INITIAL_USERS[2], // Elena (RECEIVER)
      users: INITIAL_USERS,
      categories: INITIAL_CATEGORIES,
      donations: INITIAL_DONATIONS,
      claims: INITIAL_CLAIMS,
      trackingRecords: INITIAL_TRACKING,
      conversations: INITIAL_CONVERSATIONS,
      notifications: INITIAL_NOTIFICATIONS,
      auditLogs: INITIAL_AUDIT_LOGS,
    });
  };

  const unreadNotificationsCount = useMemo(() => {
    if (!state.currentUser) return 0;
    return state.notifications.filter((n) => n.user_id === state.currentUser!.id && !n.is_read).length;
  }, [state.notifications, state.currentUser]);

  return (
    <StoreContext.Provider
      value={{
        ...state,
        setCurrentUser,
        loginAs,
        signUp,
        logout,
        createDonation,
        cancelDonation,
        createClaim,
        approveClaim,
        rejectClaim,
        cancelClaim,
        startPickup,
        acceptRunnerRun,
        regenerateHandoverOtp,
        updateReceiverLocation,
        updateCurrentLocation,
        verifyHandover,
        sendMessage,
        markNotificationRead,
        markAllNotificationsRead,
        toggleUserStatus,
        changeUserRole,
        resetToDemoData,
        unreadNotificationsCount,
        toasts,
        addToast,
        dismissToast,
        requestedReviewDonationId,
        setRequestedReviewDonationId,
        triggerMockRequestToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
