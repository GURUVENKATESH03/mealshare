import React, { useState, useEffect } from 'react';
import { useStore } from '../domain/store.tsx';
import {
  X,
  ShieldCheck,
  Truck,
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  RefreshCw,
} from 'lucide-react';

interface PickupTrackingModalProps {
  trackingId: string | null;
  onClose: () => void;
}

export const PickupTrackingModal: React.FC<PickupTrackingModalProps> = ({
  trackingId,
  onClose,
}) => {
  const { currentUser, trackingRecords, donations, claims, verifyHandover, updateReceiverLocation } =
    useStore();

  const [enteredCode, setEnteredCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);

  const tracking = trackingRecords.find((t) => t.id === trackingId);
  const donation = tracking ? donations.find((d) => d.id === tracking.donation_id) : null;
  const claim = tracking ? claims.find((c) => c.id === tracking.donation_request_id) : null;

  if (!tracking || !donation) return null;

  const isReceiver = currentUser?.id === tracking.receiver_id;
  const isDonor = currentUser?.id === tracking.donor_id || currentUser?.role === 'ADMIN';

  // Realistic transit GPS step simulation when receiver toggles location sharing
  useEffect(() => {
    if (!isSimulatingGps || tracking.pickup_status !== 'EN_ROUTE') return;

    const interval = setInterval(() => {
      // Step closer to donation pickup coordinate
      const currentLat = tracking.receiver_latitude || 37.7695;
      const currentLng = tracking.receiver_longitude || -122.4145;
      const targetLat = donation.latitude;
      const targetLng = donation.longitude;

      const deltaLat = (targetLat - currentLat) * 0.25;
      const deltaLng = (targetLng - currentLng) * 0.25;

      updateReceiverLocation(tracking.id, currentLat + deltaLat, currentLng + deltaLng);
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulatingGps, tracking, donation, updateReceiverLocation]);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsVerifying(true);

    const res = verifyHandover(tracking.id, enteredCode);
    setIsVerifying(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Verification failed.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracking-title"
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-[#E8DEC9] shadow-2xl p-6 sm:p-8 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F3ECE1] text-[#7E7063] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="w-7 h-7 rounded-lg bg-[#2D6A4F]/10 text-[#2D6A4F] flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </span>
          <span className="text-xs font-mono uppercase tracking-wider text-[#2D6A4F] font-bold">
            Verified Handover Coordination
          </span>
        </div>

        <h2 id="tracking-title" className="font-display font-bold text-2xl text-[#1E1611] tracking-tight">
          {donation.title}
        </h2>
        <p className="text-xs text-[#7E7063] mt-0.5">
          Pickup at: {donation.pickup_address} · {donation.quantity} {donation.quantity_unit}
        </p>

        {/* Progress Stepper */}
        <div className="mt-6 pt-2 pb-4 border-y border-[#E8DEC9]/70 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2 text-[#2D6A4F]">
            <span className="w-5 h-5 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
            <span>1. Claim Approved</span>
          </div>

          <div className="h-px flex-1 bg-[#E8DEC9] mx-3" />

          <div
            className={`flex items-center gap-2 ${
              tracking.pickup_status === 'EN_ROUTE'
                ? 'text-[#D97706] font-semibold'
                : tracking.pickup_status === 'VERIFIED'
                ? 'text-[#2D6A4F]'
                : 'text-[#7E7063]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                tracking.pickup_status === 'VERIFIED'
                  ? 'bg-[#2D6A4F] text-white'
                  : 'bg-[#D97706] text-white'
              }`}
            >
              {tracking.pickup_status === 'VERIFIED' ? '✓' : '2'}
            </span>
            <span>2. En Route</span>
          </div>

          <div className="h-px flex-1 bg-[#E8DEC9] mx-3" />

          <div
            className={`flex items-center gap-2 ${
              tracking.pickup_status === 'VERIFIED'
                ? 'text-[#2D6A4F] font-bold'
                : 'text-[#7E7063]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                tracking.pickup_status === 'VERIFIED'
                  ? 'bg-[#2D6A4F] text-white'
                  : 'bg-[#FAF7F2] border border-[#E8DEC9] text-[#7E7063]'
              }`}
            >
              3
            </span>
            <span>3. Verified</span>
          </div>
        </div>

        {/* Case 1: Handover Verified Successfully */}
        {tracking.pickup_status === 'VERIFIED' ? (
          <div className="mt-6 p-6 rounded-2xl bg-[#E8F5EE] border border-[#2D6A4F]/20 text-center">
            <div className="w-12 h-12 rounded-full bg-[#2D6A4F] text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-[#1E1611]">
              Handover Verified & Rescued!
            </h3>
            <p className="text-xs text-[#2D6A4F] mt-1.5 max-w-md mx-auto leading-relaxed">
              The 6-digit code was matched successfully. The donation has been collected and logged in the community surplus archive.
            </p>
            <div className="mt-4 pt-3 border-t border-[#2D6A4F]/20 text-xs text-[#7E7063] font-mono">
              Completed at {new Date(claim?.completed_at || Date.now()).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <>
            {/* Receiver View: Big Code Card */}
            {isReceiver && (
              <div className="mt-6 p-6 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC9] text-center">
                <span className="text-[11px] uppercase tracking-wider font-mono text-[#D97706] font-bold block mb-1">
                  Your Private Handover Code
                </span>
                <p className="text-xs text-[#7E7063] mb-4">
                  Show this 6-digit code to the donor upon collecting the food:
                </p>

                {/* Big 6-digit code badge */}
                <div className="inline-block py-3 px-8 rounded-2xl bg-white border-2 border-[#D97706] shadow-sm">
                  <span className="font-mono text-3xl font-extrabold tracking-widest text-[#1E1611]">
                    {tracking.verification_code}
                  </span>
                </div>

                <p className="text-[11px] text-[#7E7063] mt-3">
                  ⚠️ Never share this code in chat or phone; show it in person.
                </p>

                {/* Location Sharing Simulation Toggle */}
                <div className="mt-6 pt-4 border-t border-[#E8DEC9] flex items-center justify-between text-xs text-left">
                  <div>
                    <span className="font-semibold text-[#1E1611] block">
                      Share Live Transit Location
                    </span>
                    <span className="text-[11px] text-[#7E7063]">
                      Helps donor know when you are arriving
                    </span>
                  </div>
                  <button
                    onClick={() => setIsSimulatingGps(!isSimulatingGps)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isSimulatingGps
                        ? 'bg-[#2D6A4F] text-white'
                        : 'bg-white border border-[#E8DEC9] text-[#4E4035]'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    {isSimulatingGps ? 'Sharing GPS' : 'Share GPS'}
                  </button>
                </div>
              </div>
            )}

            {/* Donor View: Verification Input Form */}
            {isDonor && (
              <div className="mt-6 p-6 rounded-2xl bg-[#FAF7F2] border border-[#E8DEC9]">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-[#D97706]" />
                  <span className="text-xs font-bold text-[#1E1611]">
                    Donor Handover Verification
                  </span>
                </div>

                <p className="text-xs text-[#7E7063] mb-4">
                  Ask {tracking.pickup_person_name} for their 6-digit code and enter it below to confirm collection:
                </p>

                {errorMsg && (
                  <div className="mb-4 p-3 rounded-xl bg-[#FDF0ED] border border-[#BA181B]/20 text-[#BA181B] text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1611] mb-1">
                      Enter 6-Digit Handover Code:
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={enteredCode}
                      onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      disabled={tracking.is_locked || isVerifying}
                      className="w-full text-center tracking-widest font-mono text-2xl font-bold py-2.5 px-4 rounded-xl border border-[#E8DEC9] bg-white text-[#1E1611] focus:ring-2 focus:ring-[#D97706] focus:outline-none disabled:bg-[#E8DEC9]/40"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#7E7063] font-mono">
                      Attempts used: {tracking.verification_attempts} / {tracking.max_attempts}
                    </span>
                    <button
                      type="submit"
                      disabled={tracking.is_locked || isVerifying || enteredCode.length !== 6}
                      className="px-5 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white font-semibold text-xs shadow-xs transition-colors disabled:opacity-50"
                    >
                      {isVerifying ? 'Verifying...' : 'Confirm Handover'}
                    </button>
                  </div>
                </form>

                {/* Receiver Info */}
                <div className="mt-5 pt-4 border-t border-[#E8DEC9] text-xs flex items-center justify-between text-[#7E7063]">
                  <span>Receiver: <strong className="text-[#1E1611]">{tracking.pickup_person_name}</strong></span>
                  <span>Contact: <strong className="font-mono text-[#1E1611]">{tracking.pickup_phone}</strong></span>
                </div>
              </div>
            )}

            {/* Modal Bottom Close */}
            <div className="mt-6 pt-3 border-t border-[#E8DEC9] flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#4E4035] hover:text-[#1E1611] border border-[#E8DEC9] transition-colors"
              >
                Close Tracking
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
