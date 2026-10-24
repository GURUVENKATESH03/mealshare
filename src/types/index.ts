export type Role = 'DONOR' | 'RECEIVER' | 'ADMIN';

export type DonationStatus = 'AVAILABLE' | 'RESERVED' | 'PICKED_UP' | 'EXPIRED' | 'CANCELLED';

export type ClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export type TrackingStatus = 'PENDING' | 'EN_ROUTE' | 'VERIFIED' | 'CANCELLED';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  organization_name?: string;
  role: Role;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  is_verified: boolean;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
}

export interface FoodCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
}

export interface Donation {
  id: string;
  donor_id: string;
  donor_name: string;
  donor_org?: string;
  donor_avatar?: string;
  title: string;
  description: string;
  category_id: string;
  quantity: string;
  quantity_unit: string;
  cooked_time?: string;
  expiry_time: string;
  pickup_address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  image_url: string;
  status: DonationStatus;
  is_emergency: boolean;
  storage_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DonationRequest {
  id: string;
  donation_id: string;
  receiver_id: string;
  receiver_name: string;
  receiver_org?: string;
  receiver_phone: string;
  request_message?: string;
  status: ClaimStatus;
  requested_at: string;
  approved_at?: string;
  rejected_at?: string;
  completed_at?: string;
}

export interface PickupTracking {
  id: string;
  donation_request_id: string;
  donation_id: string;
  receiver_id: string;
  donor_id: string;
  pickup_person_name: string;
  pickup_phone: string;
  planned_pickup_time: string;
  verification_code: string; // Private six-digit code
  verification_attempts: number;
  max_attempts: number;
  is_locked: boolean;
  pickup_status: TrackingStatus;
  receiver_latitude?: number;
  receiver_longitude?: number;
  last_location_update?: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  text: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  donation_id: string;
  donor_id: string;
  receiver_id: string;
  updated_at: string;
  messages: Message[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type:
    | 'CLAIM_RECEIVED'
    | 'CLAIM_APPROVED'
    | 'CLAIM_REJECTED'
    | 'CLAIM_COMPETING_REJECTED'
    | 'CLAIM_CANCELLED'
    | 'PICKUP_STARTED'
    | 'PICKUP_VERIFIED'
    | 'PICKUP_CANCELLED'
    | 'DONATION_EXPIRED';
  link_type?: 'donation' | 'tracking' | 'requests' | 'claims';
  link_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: string;
  created_at: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'claim';
  timestamp: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

