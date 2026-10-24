import React, { useState } from 'react';
import { Donation } from '../types/index.ts';
import { useStore } from '../domain/store.tsx';
import { maskPhoneNumber } from '../domain/rules.ts';
import {
  X,
  Check,
  Ban,
  Clock,
  Phone,
  Truck,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface DonorClaimsReviewModalProps {
  donation: Donation | null;
  onClose: () => void;
  onOpenTracking: (trackingId: string) => void;
  onOpenVerifyHandover?: (donationId: string) => void;
}

export const DonorClaimsReviewModal: React.FC<DonorClaimsReviewModalProps> = ({
  donation,
  onClose,
  onOpenTracking,
  onOpenVerifyHandover,
}) => {
  const { claims, trackingRecords, approveClaim, rejectClaim } = useStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!donation) return null;

  const donationClaims = claims.filter((c) => c.donation_id === donation.id);
  const pendingClaims = donationClaims.filter((c) => c.status === 'PENDING');
  const approvedClaim = donationClaims.find((c) => c.status === 'APPROVED' || c.status === 'COMPLETED');
  const otherClaims = donationClaims.filter(
    (c) => c.status !== 'PENDING' && c.id !== approvedClaim?.id
  );

  const activeTracking = approvedClaim
    ? trackingRecords.find((t) => t.donation_request_id === approvedClaim.id)
    : null;

  const handleApprove = (claimId: string) => {
    setErrorMsg(null);
    const res = approveClaim(claimId);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to approve claim.');
    }
  };

  const handleReject = (claimId: string) => {
    setErrorMsg(null);
    const res = rejectClaim(claimId);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to reject claim.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-claims-title"
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-[#E8DEC9] shadow-2xl p-6 sm:p-8 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F3ECE1] text-[#7E7063] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#D97706] font-semibold">
            Single-Approval Coordination
          </span>
          <h2 id="review-claims-title" className="font-display font-bold text-xl text-[#1E1611] tracking-tight mt-0.5">
            Review Claims: {donation.title}
          </h2>
          <p className="text-xs text-[#7E7063] mt-1">
            Status: <strong className="uppercase font-mono text-[#1E1611]">{donation.status}</strong> · {donation.quantity} {donation.quantity_unit}
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-[#FDF0ED] border border-[#BA181B]/20 text-[#BA181B] text-xs">
            {errorMsg}
          </div>
        )}

        {/* If a claim is already approved */}
        {approvedClaim && (
          <div className="mt-5 p-4 rounded-2xl bg-[#E8F5EE] border border-[#2D6A4F]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#2D6A4F]" />
                <div>
                  <h4 className="text-xs font-bold text-[#1E1611]">
                    Approved Claim: {approvedClaim.receiver_name}
                  </h4>
                  <p className="text-[11px] text-[#2D6A4F]">
                    {approvedClaim.receiver_org || 'Community Member'} · Phone: {approvedClaim.receiver_phone}
                  </p>
                </div>
              </div>

              {activeTracking ? (
                <button
                  onClick={() => {
                    if (activeTracking.pickup_status !== 'VERIFIED' && onOpenVerifyHandover) {
                      onOpenVerifyHandover(donation.id);
                    } else {
                      onOpenTracking(activeTracking.id);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#2D6A4F] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 hover:bg-[#1B4332]"
                >
                  <Truck className="w-3.5 h-3.5" />
                  {activeTracking.pickup_status === 'VERIFIED' ? 'View Verification' : 'Verify Handover'}
                </button>
              ) : (
                <span className="text-xs text-[#7E7063] font-medium">Awaiting Receiver Departure</span>
              )}
            </div>

            {activeTracking && (
              <div className="mt-3 pt-3 border-t border-[#2D6A4F]/15 flex items-center justify-between text-xs text-[#2D6A4F]">
                <span>Status: <strong>{activeTracking.pickup_status}</strong></span>
                <span>ETA: <strong>{activeTracking.planned_pickup_time}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* Pending Claims Section */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#1E1611] uppercase tracking-wider font-mono">
              Pending Requests ({pendingClaims.length})
            </h3>
            {pendingClaims.length > 1 && (
              <span className="text-[11px] text-[#7E7063]">
                Approving one auto-rejects others
              </span>
            )}
          </div>

          {pendingClaims.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC9] text-center text-xs text-[#7E7063]">
              No pending claims at this moment.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-4 rounded-2xl border border-[#E8DEC9] bg-[#FAF7F2] hover:bg-[#F3ECE1]/40 transition-colors flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1E1611]">{claim.receiver_name}</span>
                      <span className="text-[11px] font-mono text-[#7E7063]">
                        {new Date(claim.requested_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {claim.receiver_org && (
                      <span className="text-xs text-[#2D6A4F] font-medium block">
                        {claim.receiver_org}
                      </span>
                    )}

                    {claim.request_message && (
                      <p className="mt-2 text-xs text-[#4E4035] bg-white p-2.5 rounded-lg border border-[#E8DEC9]/60 italic">
                        "{claim.request_message}"
                      </p>
                    )}
                  </div>

                  {donation.status === 'AVAILABLE' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8DEC9]/50">
                      <button
                        onClick={() => handleReject(claim.id)}
                        className="px-3 py-1.5 rounded-lg border border-[#E8DEC9] text-xs font-medium text-[#BA181B] hover:bg-[#FDF0ED]"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleApprove(claim.id)}
                        className="px-4 py-1.5 rounded-lg bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve & Reserve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Other / Rejected claims */}
        {otherClaims.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[#E8DEC9]">
            <h4 className="text-xs font-medium text-[#7E7063] mb-2">Past / Released Requests</h4>
            <div className="space-y-1.5">
              {otherClaims.map((c) => (
                <div key={c.id} className="text-xs text-[#7E7063] flex items-center justify-between py-1">
                  <span>{c.receiver_name} ({c.receiver_org || 'Individual'})</span>
                  <span className="font-mono text-[11px] uppercase">{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Close Button */}
        <div className="mt-6 pt-4 border-t border-[#E8DEC9] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#4E4035] hover:text-[#1E1611] border border-[#E8DEC9] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
