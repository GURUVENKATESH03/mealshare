import React, { useState } from 'react';
import { useStore } from '../domain/store.tsx';
import { DonationRequest, Donation } from '../types/index.ts';
import {
  Package,
  Truck,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
  Bike,
  UserRound,
} from 'lucide-react';

interface MyRequestsViewProps {
  onOpenTracking: (trackingId: string) => void;
  onOpenChat: (donation: Donation) => void;
}

export const MyRequestsView: React.FC<MyRequestsViewProps> = ({
  onOpenTracking,
  onOpenChat,
}) => {
  const { currentUser, claims, donations, trackingRecords, startPickup, cancelClaim } = useStore();

  const [startingClaimId, setStartingClaimId] = useState<string | null>(null);
  const [pickupPerson, setPickupPerson] = useState(currentUser?.full_name || '');
  const [pickupPhone, setPickupPhone] = useState(currentUser?.phone_number || '');
  const [plannedTime, setPlannedTime] = useState('Within 45 minutes');

  const myClaims = claims.filter((c) => c.receiver_id === currentUser?.id);

  const handleStartPickup = (claim: DonationRequest) => {
    const res = startPickup({
      donationRequestId: claim.id,
      pickupPersonName: pickupPerson || currentUser!.full_name,
      pickupPhone: pickupPhone || currentUser!.phone_number,
      plannedTime,
    });

    if (res.success && res.trackingId) {
      setStartingClaimId(null);
      onOpenTracking(res.trackingId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <span className="text-xs font-mono uppercase tracking-wider text-[#2D6A4F] font-bold">
          Receiver Dashboard
        </span>
        <h1 className="font-display font-extrabold text-2xl text-[#1E1611] tracking-tight mt-0.5">
          My Surplus Food Requests
        </h1>
        <p className="text-xs text-[#7E7063] mt-1">
          Track your claims, get secret 6-digit handover codes, and coordinate pickups.
        </p>
      </div>

      {myClaims.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#E8DEC9]">
          <Package className="w-10 h-10 text-[#D97706] mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-[#1E1611]">No food claimed yet</h3>
          <p className="text-xs text-[#7E7063] mt-1 max-w-sm mx-auto">
            Browse available food donations on the Discover Feed or Live Map to claim surplus for your community.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {myClaims.map((claim) => {
            const donation = donations.find((d) => d.id === claim.donation_id);
            const tracking = trackingRecords.find((t) => t.donation_request_id === claim.id);

            return (
              <div
                key={claim.id}
                className="p-5 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                        claim.status === 'APPROVED'
                          ? 'bg-[#E8F5EE] text-[#2D6A4F]'
                          : claim.status === 'COMPLETED'
                          ? 'bg-[#2D6A4F] text-white'
                          : claim.status === 'REJECTED'
                          ? 'bg-[#FDF0ED] text-[#BA181B]'
                          : 'bg-[#FEF3C7] text-[#D97706]'
                      }`}
                    >
                      {claim.status}
                    </span>
                    <span className="text-xs text-[#7E7063]">
                      Requested {new Date(claim.requested_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                        claim.pickup_mode === 'RUNNER'
                          ? 'bg-[#EFF6FF] text-[#2563EB] border-[#2563EB]/20'
                          : 'bg-[#FAF7F2] text-[#4E4035] border-[#E8DEC9]'
                      }`}
                    >
                      {claim.pickup_mode === 'RUNNER' ? (
                        <>
                          <Bike className="w-3 h-3" />
                          Rescue Runner
                        </>
                      ) : (
                        <>
                          <UserRound className="w-3 h-3" />
                          Self pickup
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg text-[#1E1611]">
                    {donation?.title || 'Food Donation'}
                  </h3>

                  {donation && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#4E4035]">
                      <span>Offered by <strong>{donation.donor_org || donation.donor_name}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>{donation.quantity} {donation.quantity_unit}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 text-[#7E7063]">
                        <MapPin className="w-3.5 h-3.5 text-[#D97706]" />
                        {donation.pickup_address}
                      </span>
                    </div>
                  )}

                  {claim.request_message && (
                    <p className="text-xs text-[#7E7063] italic">
                      Your note: "{claim.request_message}"
                    </p>
                  )}

                  {claim.pickup_mode === 'RUNNER' && claim.status === 'APPROVED' && (
                    <p className="text-[11px] text-[#2563EB]">
                      {claim.runner_name
                        ? `Rescue Runner ${claim.runner_name} is handling this pickup (${claim.runner_phone}).`
                        : 'No Rescue Runner has accepted yet. The one-time code will be issued to them when they accept.'}
                    </p>
                  )}
                </div>

                {/* Status-Driven Action Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#E8DEC9]/50">
                  {donation && (
                    <button
                      onClick={() => onOpenChat(donation)}
                      className="p-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-[#4E4035] hover:text-[#1E1611] transition-colors"
                      title="Message Donor"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}

                  {claim.status === 'PENDING' && (
                    <button
                      onClick={() => cancelClaim(claim.id)}
                      className="px-3 py-1.5 rounded-xl border border-[#E8DEC9] text-xs font-medium text-[#BA181B] hover:bg-[#FDF0ED]"
                    >
                      Cancel Claim
                    </button>
                  )}

                  {claim.status === 'APPROVED' && !tracking && claim.pickup_mode !== 'RUNNER' && (
                    <button
                      onClick={() => setStartingClaimId(claim.id)}
                      className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <Truck className="w-4 h-4" />
                      Start Pickup
                    </button>
                  )}

                  {claim.status === 'APPROVED' && !tracking && claim.pickup_mode === 'RUNNER' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#EFF6FF] border border-[#2563EB]/20 text-[11px] font-semibold text-[#2563EB]">
                      <Bike className="w-4 h-4" />
                      Waiting for a Rescue Runner
                    </span>
                  )}

                  {tracking && (
                    <button
                      onClick={() => onOpenTracking(tracking.id)}
                      className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <Truck className="w-4 h-4" />
                      {tracking.pickup_status === 'VERIFIED'
                        ? 'View Receipt'
                        : claim.pickup_mode === 'RUNNER'
                        ? 'Track Rescue Runner'
                        : 'Show Handover Code'}
                    </button>
                  )}
                </div>

                {/* Inline Start Pickup Drawer */}
                {startingClaimId === claim.id && (
                  <div className="w-full mt-4 p-4 rounded-xl bg-[#FAF7F2] border border-[#2D6A4F]/30 col-span-full space-y-3">
                    <h4 className="text-xs font-bold text-[#1E1611]">
                      Ready to collect? Enter pickup details:
                    </h4>
                    <p className="text-[11px] text-[#7E7063]">
                      Starting pickup issues a fresh single-use 6-digit handover code. It expires after
                      30 minutes and can only be verified once.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={pickupPerson}
                        onChange={(e) => setPickupPerson(e.target.value)}
                        placeholder="Pickup person name"
                        className="px-3 py-1.5 rounded-lg border border-[#E8DEC9] bg-white text-xs"
                      />
                      <input
                        type="tel"
                        value={pickupPhone}
                        onChange={(e) => setPickupPhone(e.target.value)}
                        placeholder="Driver phone number"
                        className="px-3 py-1.5 rounded-lg border border-[#E8DEC9] bg-white text-xs font-mono"
                      />
                      <input
                        type="text"
                        value={plannedTime}
                        onChange={(e) => setPlannedTime(e.target.value)}
                        placeholder="Planned arrival (e.g. 30 mins)"
                        className="px-3 py-1.5 rounded-lg border border-[#E8DEC9] bg-white text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setStartingClaimId(null)}
                        className="px-3 py-1 text-xs text-[#7E7063]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleStartPickup(claim)}
                        className="px-4 py-1.5 rounded-lg bg-[#2D6A4F] text-white text-xs font-semibold"
                      >
                        Confirm & Reveal Handover Code
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
