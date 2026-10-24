import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../domain/store.tsx';
import { Donation, PickupTracking } from '../types/index.ts';
import { ModalShell } from './ModalShell.tsx';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  MapPin,
  Calendar,
  Package,
  Award,
  ArrowRight,
} from 'lucide-react';

interface VerifyHandoverModalProps {
  initialDonationId?: string | null;
  onClose: () => void;
}

export const VerifyHandoverModal: React.FC<VerifyHandoverModalProps> = ({
  initialDonationId,
  onClose,
}) => {
  const { currentUser, donations, claims, trackingRecords, verifyHandover } = useStore();

  // Only listings that actually have a live tracking record can be verified.
  // Approval alone is not enough: the OTP is issued when collection starts.
  const reservedDonations = donations.filter((d) => {
    if (d.donor_id !== currentUser?.id) return false;
    const approved = claims.find(
      (c) => c.donation_id === d.id && (c.status === 'APPROVED' || c.status === 'COMPLETED')
    );
    if (!approved) return false;
    const trackingRecord = trackingRecords.find((t) => t.donation_request_id === approved.id);
    return !!trackingRecord && trackingRecord.pickup_status !== 'CANCELLED';
  });

  const [selectedDonationId, setSelectedDonationId] = useState<string>(
    initialDonationId || reservedDonations[0]?.id || ''
  );

  // 6 individual digit states for high-fidelity PIN entry
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);
  const [finalReceipt, setFinalReceipt] = useState<{
    donationTitle: string;
    quantity: string;
    receiverName: string;
    receiverOrg?: string;
    verifiedAt: string;
    verifiedCode: string;
  } | null>(null);

  const selectedDonation = donations.find((d) => d.id === selectedDonationId);
  const approvedClaim = selectedDonation
    ? claims.find((c) => c.donation_id === selectedDonation.id && (c.status === 'APPROVED' || c.status === 'COMPLETED'))
    : null;

  const tracking = approvedClaim
    ? trackingRecords.find((t) => t.donation_request_id === approvedClaim.id)
    : null;

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [selectedDonationId]);

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    // Support typing single character
    const char = cleaned.slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    // Auto-advance to next input
    if (index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasteData[i] || '';
    }
    setDigits(next);

    // Focus last filled or 6th input
    const focusIdx = Math.min(pasteData.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the handover code.');
      return;
    }

    if (!tracking) {
      setErrorMsg('No active pickup record found for this listing.');
      return;
    }

    setIsVerifying(true);
    const res = verifyHandover(tracking.id, fullCode);
    setIsVerifying(false);

    if (res.success) {
      setIsVerifiedSuccess(true);
      const collectedBy = tracking.pickup_person_name || approvedClaim?.receiver_name || 'Receiver';
      setFinalReceipt({
        donationTitle: selectedDonation?.title || 'Surplus Food',
        quantity: `${selectedDonation?.quantity} ${selectedDonation?.quantity_unit}`,
        receiverName: collectedBy,
        receiverOrg:
          collectedBy === approvedClaim?.receiver_name ? approvedClaim?.receiver_org : undefined,
        verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        verifiedCode: fullCode,
      });
    } else {
      setErrorMsg(res.error || 'Incorrect code. Handover was not verified.');
    }
  };

  return (
    <ModalShell
      onClose={onClose}
      labelledBy="verify-handover-title"
      maxWidth="max-w-xl"
      panelClassName="p-6 sm:p-8"
    >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F3ECE1] text-[#7E7063] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <span className="w-8 h-8 rounded-xl bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <span className="text-xs font-mono uppercase tracking-wider text-[#2D6A4F] font-bold">
            Donor Handover Verification
          </span>
        </div>

        <h2 id="verify-handover-title" className="font-display font-bold text-2xl text-[#1E1611] tracking-tight">
          Verify Physical Handover
        </h2>
        <p className="text-xs text-[#7E7063] mt-1 leading-relaxed">
          Ask the receiver or assigned Rescue Runner to show their single-use 6-digit code after the physical collection is complete. Entering it consumes the code and finalizes the transaction.
        </p>

        {reservedDonations.length === 0 ? (
          <div className="mt-6 p-6 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC9] text-center">
            <Package className="w-8 h-8 text-[#D5C9B5] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#1E1611]">No handover is ready to verify</p>
            <p className="text-xs text-[#7E7063] mt-1 max-w-sm mx-auto leading-relaxed">
              A one-time code is issued only when the receiver (or assigned Rescue Runner) starts the
              pickup. Once collection is underway, this screen will accept their 6-digit code.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-xl bg-white border border-[#E8DEC9] text-xs font-semibold text-[#4E4035] hover:bg-[#F3ECE1]"
            >
              Back to dashboard
            </button>
          </div>
        ) : isVerifiedSuccess && finalReceipt ? (
          <div className="mt-6 p-6 rounded-2xl bg-[#E8F5EE] border border-[#2D6A4F]/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="font-display font-extrabold text-xl text-[#1E1611] text-center">
              Handover Successfully Verified!
            </h3>
            <p className="text-xs text-[#2D6A4F] text-center mt-1">
              Transaction finalized: Food status updated to <strong>PICKED_UP</strong>.
            </p>

            {/* Official Digital Collection Receipt Card */}
            <div className="mt-5 p-4 rounded-xl bg-white border border-[#2D6A4F]/20 text-xs space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8DEC9]">
                <span className="font-mono text-[10px] uppercase text-[#7E7063]">Collection Receipt</span>
                <span className="px-2 py-0.5 rounded-full bg-[#2D6A4F] text-white font-mono text-[10px] font-bold">
                  VERIFIED & COMPLETED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#7E7063] block text-[10px]">Surplus Rescued:</span>
                  <span className="font-bold text-[#1E1611]">{finalReceipt.donationTitle}</span>
                  <span className="text-[11px] text-[#2D6A4F] block font-medium">{finalReceipt.quantity}</span>
                </div>

                <div>
                  <span className="text-[#7E7063] block text-[10px]">Collected by:</span>
                  <span className="font-bold text-[#1E1611]">{finalReceipt.receiverName}</span>
                  {finalReceipt.receiverOrg && (
                    <span className="text-[11px] text-[#7E7063] block">{finalReceipt.receiverOrg}</span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8DEC9] flex items-center justify-between text-[11px] text-[#7E7063]">
                <span>Verified Code: <strong className="font-mono text-[#1E1611]">{finalReceipt.verifiedCode}</strong></span>
                <span>Timestamp: <strong className="font-mono text-[#1E1611]">{finalReceipt.verifiedAt}</strong></span>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Done / Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* CODE INPUT FORM */
          <div className="mt-6 space-y-5">
            {/* Listing Selector (if multiple reserved listings) */}
            {reservedDonations.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-[#1E1611] mb-1">
                  Select Listing Being Handed Over:
                </label>
                <select
                  value={selectedDonationId}
                  onChange={(e) => {
                    setSelectedDonationId(e.target.value);
                    setDigits(['', '', '', '', '', '']);
                    setErrorMsg(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none"
                >
                  {reservedDonations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.quantity} {d.quantity_unit})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Handover Details Strip */}
            {selectedDonation && approvedClaim && (
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC9] flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-[#7E7063] uppercase font-mono block">Food Item</span>
                  <strong className="text-[#1E1611] block">{selectedDonation.title}</strong>
                  <span className="text-[#2D6A4F] font-medium">
                    {selectedDonation.quantity} {selectedDonation.quantity_unit}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#7E7063] uppercase font-mono block">Recipient</span>
                  <strong className="text-[#1E1611] block">{approvedClaim.receiver_name}</strong>
                  <span className="text-[#7E7063] block font-mono text-[11px]">
                    {approvedClaim.receiver_phone}
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-[#FDF0ED] border border-[#BA181B]/20 text-[#BA181B] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* 6-Digit PIN Boxes Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-center text-[#1E1611] mb-3">
                  Enter 6-Digit Receiver Code:
                </label>

                {/* 6 Box Inputs */}
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {digits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={idx === 0 ? handlePaste : undefined}
                      disabled={tracking?.is_locked || isVerifying}
                      className="w-12 h-14 sm:w-14 sm:h-16 text-center font-mono text-2xl font-extrabold rounded-2xl border-2 border-[#E8DEC9] bg-[#FAF7F2] text-[#1E1611] focus:bg-white focus:border-[#2D6A4F] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]/20 transition-all shadow-xs disabled:opacity-50"
                      aria-label={`Digit ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Attempts counter & security status */}
                <div className="mt-3 flex items-center justify-center gap-4 text-xs text-[#7E7063]">
                  <span>
                    Attempts used:{' '}
                    <strong className="font-mono text-[#1E1611]">
                      {tracking?.verification_attempts || 0} / {tracking?.max_attempts || 5}
                    </strong>
                  </span>
                  {tracking?.is_locked && (
                    <span className="text-[#BA181B] font-bold">Account Locked (Max attempts exceeded)</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E8DEC9] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-[#E8DEC9] bg-white hover:bg-[#FAF7F2] text-[#4E4035] text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    digits.some((d) => !d) ||
                    tracking?.is_locked ||
                    isVerifying ||
                    !tracking
                  }
                  className="px-6 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isVerifying ? (
                    <span>Verifying...</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify & Finalize Handover</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
    </ModalShell>
  );
};
