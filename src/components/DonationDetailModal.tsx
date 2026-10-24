import React, { useState } from 'react';
import { Donation, PickupMode } from '../types/index.ts';
import { useStore } from '../domain/store.tsx';
import { getExpiryRemaining, calculateDistanceKm } from '../domain/rules.ts';
import { ModalShell } from './ModalShell.tsx';
import {
  X,
  MapPin,
  Clock,
  Package,
  AlertCircle,
  Building2,
  Calendar,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  UserRound,
  Bike,
} from 'lucide-react';

interface DonationDetailModalProps {
  donation: Donation | null;
  onClose: () => void;
  onOpenManageClaims: (donation: Donation) => void;
  onOpenChat: (donation: Donation) => void;
}

export const DonationDetailModal: React.FC<DonationDetailModalProps> = ({
  donation,
  onClose,
  onOpenManageClaims,
  onOpenChat,
}) => {
  const { currentUser, categories, claims, createClaim } = useStore();
  const [claimMessage, setClaimMessage] = useState('');
  const [pickupMode, setPickupMode] = useState<PickupMode>('SELF');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!donation) return null;

  const category = categories.find((c) => c.id === donation.category_id);
  const expiryInfo = getExpiryRemaining(donation.expiry_time);

  const isOwner = currentUser?.id === donation.donor_id;
  const isReceiver = currentUser?.role === 'RECEIVER';

  const myClaim = claims.find(
    (c) => c.donation_id === donation.id && c.receiver_id === currentUser?.id
  );

  const distance =
    currentUser?.latitude && currentUser?.longitude
      ? calculateDistanceKm(
          { latitude: currentUser.latitude, longitude: currentUser.longitude },
          { latitude: donation.latitude, longitude: donation.longitude }
        )
      : null;

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const res = createClaim(donation.id, claimMessage, pickupMode);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to submit claim.');
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      labelledBy="detail-title"
      maxWidth="max-w-2xl"
      panelClassName="overflow-hidden"
    >
        {/* Top Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white text-[#1E1611] backdrop-blur-md shadow-md transition-all hover:scale-105 border border-[#E8DEC9]"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Image */}
        <div className="relative aspect-16/9 w-full bg-[#F3ECE1] overflow-hidden">
          <img
            src={donation.image_url}
            alt={donation.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {donation.is_emergency && (
            <div className="absolute top-4 left-4 bg-[#BA181B] text-white text-xs font-semibold px-3 py-1 rounded-md shadow-sm flex items-center gap-1.5 uppercase tracking-wide">
              <AlertCircle className="w-4 h-4" />
              Surplus Alert
            </div>
          )}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs font-medium">
            <span className="px-3 py-1 rounded-md bg-black/60 backdrop-blur-xs">
              {category?.name || 'Surplus Food'}
            </span>
            <span
              className={`px-3 py-1 rounded-md backdrop-blur-xs ${
                expiryInfo.isUrgent ? 'bg-[#BA181B]/90 font-bold' : 'bg-black/60'
              }`}
            >
              ⏰ {expiryInfo.label}
            </span>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-xs text-[#7E7063] font-medium mb-1">
              <span>Quantity: {donation.quantity} {donation.quantity_unit}</span>
              {distance !== null && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[#2D6A4F]">{distance} km from you</span>
                </>
              )}
            </div>
            <h2 id="detail-title" className="font-display font-bold text-2xl text-[#1E1611] tracking-tight">
              {donation.title}
            </h2>
          </div>

          {/* Description */}
          <div className="mt-4 text-[#4E4035] text-sm leading-relaxed">
            <p>{donation.description}</p>
          </div>

          {/* Specs Grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DEC9]">
            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-[#D97706] mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="text-[#7E7063] block">Offered by:</span>
                <span className="font-semibold text-[#1E1611]">
                  {donation.donor_org || donation.donor_name}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#2D6A4F] mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="text-[#7E7063] block">Pickup Location:</span>
                <span className="font-semibold text-[#1E1611]">{donation.pickup_address}</span>
              </div>
            </div>

            {donation.cooked_time && (
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-[#7E7063] mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="text-[#7E7063] block">Prepared / Cooked:</span>
                  <span className="font-semibold text-[#1E1611]">
                    {new Date(donation.cooked_time).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-[#BA181B] mt-0.5 shrink-0" />
              <div className="text-xs">
                <span className="text-[#7E7063] block">Pickup Deadline:</span>
                <span className="font-semibold text-[#1E1611]">
                  {new Date(donation.expiry_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  ({expiryInfo.label})
                </span>
              </div>
            </div>
          </div>

          {/* Storage notes */}
          {donation.storage_notes && (
            <div className="mt-4 p-3 rounded-lg bg-[#FEF3C7]/40 border border-[#FEF3C7] text-xs text-[#78350F]">
              <span className="font-semibold block mb-0.5">Handling & Storage Notes:</span>
              {donation.storage_notes}
            </div>
          )}

          {/* Interactive Action Area with Clear Close / Cancel Buttons */}
          <div className="mt-6 pt-5 border-t border-[#E8DEC9]">
            {isOwner ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-[#7E7063]">
                  You listed this surplus food. Review and approve claims from community receivers.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#4E4035] text-xs font-semibold transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenManageClaims(donation)}
                    className="px-5 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
                  >
                    Review Incoming Claims
                  </button>
                </div>
              </div>
            ) : myClaim ? (
              <div className="p-4 rounded-xl bg-[#F3ECE1] border border-[#E8DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-[#1E1611] block">
                    You have submitted a claim
                  </span>
                  <span className="text-xs text-[#7E7063]">
                    Status: <strong className="uppercase font-mono text-[#2D6A4F]">{myClaim.status}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenChat(donation)}
                    className="px-3.5 py-2 rounded-lg border border-[#E8DEC9] bg-white text-xs font-medium text-[#1E1611] flex items-center gap-1.5 hover:bg-[#FAF7F2]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message Donor
                  </button>
                  <button
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-lg bg-[#FAF7F2] hover:bg-white border border-[#E8DEC9] text-xs font-semibold text-[#4E4035]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : donation.status !== 'AVAILABLE' ? (
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DEC9] text-xs text-[#7E7063] flex items-center justify-between">
                <span>This listing is currently <strong className="uppercase">{donation.status}</strong> and cannot be claimed.</span>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-[#E8DEC9] bg-white text-xs font-semibold text-[#4E4035]"
                >
                  Close
                </button>
              </div>
            ) : isReceiver ? (
              successMsg ? (
                <div className="p-4 rounded-xl bg-[#E8F5EE] border border-[#2D6A4F]/20 text-[#2D6A4F] text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      Your claim was submitted to {donation.donor_name}.
                      {pickupMode === 'RUNNER'
                        ? ' A Rescue Runner can accept the run once it is approved.'
                        : ' You will be notified once it is reviewed.'}
                    </span>
                  </div>
                  <button
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold shrink-0"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleClaim} className="space-y-3">
                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-[#FDF0ED] border border-[#BA181B]/20 text-[#BA181B] text-xs">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <span className="block text-xs font-medium text-[#4E4035] mb-1.5">
                      How will this be collected?
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPickupMode('SELF')}
                        aria-pressed={pickupMode === 'SELF'}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          pickupMode === 'SELF'
                            ? 'border-[#2D6A4F] bg-[#E8F5EE]'
                            : 'border-[#E8DEC9] bg-[#FAF7F2] hover:bg-[#F3ECE1]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#1E1611]">
                          <UserRound className="w-3.5 h-3.5 text-[#2D6A4F]" />
                          I'll collect it myself
                        </span>
                        <span className="block text-[11px] text-[#7E7063] mt-1 leading-relaxed">
                          You receive a single-use 6-digit code for the handover.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPickupMode('RUNNER')}
                        aria-pressed={pickupMode === 'RUNNER'}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          pickupMode === 'RUNNER'
                            ? 'border-[#2563EB] bg-[#EFF6FF]'
                            : 'border-[#E8DEC9] bg-[#FAF7F2] hover:bg-[#F3ECE1]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#1E1611]">
                          <Bike className="w-3.5 h-3.5 text-[#2563EB]" />
                          Send a Rescue Runner
                        </span>
                        <span className="block text-[11px] text-[#7E7063] mt-1 leading-relaxed">
                          A nearby runner collects and delivers it. The one-time code goes to them.
                        </span>
                      </button>
                    </div>
                    {pickupMode === 'RUNNER' && (
                      <p className="mt-2 text-[11px] text-[#2563EB] bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg px-2.5 py-1.5">
                        You stay the claim owner. Once the donor approves, a Rescue Runner can accept the run.
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="claim-msg" className="block text-xs font-medium text-[#4E4035] mb-1">
                      Pickup Note for Donor (Optional):
                    </label>
                    <input
                      id="claim-msg"
                      type="text"
                      value={claimMessage}
                      onChange={(e) => setClaimMessage(e.target.value)}
                      placeholder="e.g. Can pick up within 45 mins with insulated transport..."
                      className="w-full px-3.5 py-2 rounded-xl border border-[#E8DEC9] bg-white text-xs text-[#1E1611] focus:outline-none focus:ring-1 focus:ring-[#2D6A4F]"
                      maxLength={180}
                    />
                  </div>

                  {/* Form Footer Action Row with Explicit Cancel / Close Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <span className="text-[11px] text-[#7E7063]">
                      Reserves entire listing upon donor approval.
                    </span>

                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#4E4035] hover:text-[#1E1611] text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {isSubmitting
                          ? 'Submitting...'
                          : pickupMode === 'RUNNER'
                          ? 'Request Claim + Runner'
                          : 'Claim This Food'}
                      </button>
                    </div>
                  </div>
                </form>
              )
            ) : (
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DEC9] text-xs text-[#7E7063] flex items-center justify-between">
                <span>Please sign in with a <strong>RECEIVER</strong> account to claim this food.</span>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-[#E8DEC9] bg-white text-xs font-semibold text-[#4E4035]"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
    </ModalShell>
  );
};
