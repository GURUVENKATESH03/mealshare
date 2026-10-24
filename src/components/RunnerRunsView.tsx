import React, { useState } from 'react';
import { useStore } from '../domain/store.tsx';
import { DonationRequest, Donation } from '../types/index.ts';
import { calculateDistanceKm, getExpiryRemaining } from '../domain/rules.ts';
import {
  Bike,
  MapPin,
  Clock,
  Building2,
  Package,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface RunnerRunsViewProps {
  onOpenTracking: (trackingId: string) => void;
}

export const RunnerRunsView: React.FC<RunnerRunsViewProps> = ({ onOpenTracking }) => {
  const { currentUser, claims, donations, trackingRecords, acceptRunnerRun } = useStore();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const distanceFor = (donation?: Donation) => {
    if (!donation || !currentUser?.latitude || !currentUser?.longitude) return null;
    return calculateDistanceKm(
      { latitude: currentUser.latitude, longitude: currentUser.longitude },
      { latitude: donation.latitude, longitude: donation.longitude }
    );
  };

  const availableRuns = claims.filter(
    (c) => c.pickup_mode === 'RUNNER' && c.status === 'APPROVED' && !c.runner_id
  );

  const myRuns = claims.filter((c) => c.runner_id === currentUser?.id);
  const activeRuns = myRuns.filter((c) => c.status === 'APPROVED');
  const completedRuns = myRuns.filter((c) => c.status === 'COMPLETED');

  const handleAccept = (claim: DonationRequest) => {
    setErrorMsg(null);
    setAcceptingId(claim.id);
    const res = acceptRunnerRun(claim.id);
    setAcceptingId(null);
    if (res.success && res.trackingId) {
      onOpenTracking(res.trackingId);
    } else {
      setErrorMsg(res.error || 'Could not accept this rescue run.');
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#2563EB] font-bold flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5" />
            Rescue Runner Dispatch
          </span>
          <h1 className="font-display font-extrabold text-2xl text-[#1E1611] tracking-tight mt-0.5">
            Rescue Runs
          </h1>
          <p className="text-xs text-[#7E7063] mt-1 max-w-xl">
            Collect approved surplus from a donor and deliver it to the community receiver. Each run
            carries a fresh single-use 6-digit handover code.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs">
          <span className="text-[11px] text-[#7E7063] block font-medium">Available Runs</span>
          <span className="font-display font-extrabold text-2xl text-[#2563EB] tabular-nums mt-1 block">
            {availableRuns.length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs">
          <span className="text-[11px] text-[#7E7063] block font-medium">Active Runs</span>
          <span className="font-display font-extrabold text-2xl text-[#D97706] tabular-nums mt-1 block">
            {activeRuns.length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs">
          <span className="text-[11px] text-[#7E7063] block font-medium">Completed Rescues</span>
          <span className="font-display font-extrabold text-2xl text-[#2D6A4F] tabular-nums mt-1 block">
            {completedRuns.length}
          </span>
        </div>
      </div>

      {/* How the one-time code works */}
      <div className="p-4 rounded-2xl bg-[#EFF6FF] border border-[#2563EB]/20 flex items-start gap-3">
        <span className="w-8 h-8 rounded-xl bg-white text-[#2563EB] flex items-center justify-center shrink-0 border border-[#2563EB]/20">
          <KeyRound className="w-4 h-4" />
        </span>
        <div className="text-xs text-[#4E4035] leading-relaxed">
          <p className="font-bold text-[#1E1611]">One code, one handover</p>
          <p className="mt-0.5">
            Accepting a run issues the code to you, not the receiver. Show it to the donor in person.
            The donor verifies it once, and the code is permanently consumed. If it expires, generate a
            fresh code from the run screen.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-[#FDF0ED] border border-[#BA181B]/20 text-[#BA181B] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Available dispatch jobs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-[#1E1611]">
            Available Near You ({availableRuns.length})
          </h2>
          <span className="text-[11px] text-[#7E7063]">Receiver requested a Rescue Runner</span>
        </div>

        {availableRuns.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-[#E8DEC9]">
            <Bike className="w-8 h-8 text-[#D5C9B5] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#1E1611]">No open runs right now</p>
            <p className="text-xs text-[#7E7063] mt-1">
              New runs appear here as soon as a donor approves a receiver's runner request.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {availableRuns.map((claim) => {
              const donation = donations.find((d) => d.id === claim.donation_id);
              const distance = distanceFor(donation);
              const expiry = donation ? getExpiryRemaining(donation.expiry_time) : null;

              return (
                <article
                  key={claim.id}
                  className="p-5 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-[#2563EB]">
                        Runner requested
                      </span>
                      <h3 className="font-display font-bold text-base text-[#1E1611] mt-0.5">
                        {donation?.title || 'Surplus food rescue'}
                      </h3>
                      <p className="text-xs text-[#7E7063] mt-0.5">
                        {donation ? `${donation.quantity} ${donation.quantity_unit}` : 'Quantity pending'}
                        {distance !== null ? ` · ${distance} km from you` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FAF7F2] border border-[#E8DEC9] text-[11px] font-semibold text-[#4E4035]">
                      <Clock className="w-3 h-3 text-[#D97706]" />
                      {expiry?.label || 'Check expiry'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DEC9]">
                      <Building2 className="w-3.5 h-3.5 text-[#D97706] mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-[#7E7063] block">Collect from</span>
                        <strong className="text-[#1E1611] block">
                          {donation?.donor_org || donation?.donor_name || 'Donor'}
                        </strong>
                        <span className="text-[11px] text-[#7E7063]">{donation?.pickup_address}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8DEC9]">
                      <Package className="w-3.5 h-3.5 text-[#2D6A4F] mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] text-[#7E7063] block">Deliver to</span>
                        <strong className="text-[#1E1611] block">{claim.receiver_name}</strong>
                        <span className="text-[11px] text-[#7E7063]">
                          {claim.receiver_org || 'Community receiver'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAccept(claim)}
                    disabled={acceptingId === claim.id}
                    className="w-full py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                  >
                    <Bike className="w-4 h-4" />
                    {acceptingId === claim.id ? 'Accepting…' : 'Accept Run & Get Code'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* My active runs */}
      <section className="space-y-3">
        <h2 className="font-display font-bold text-lg text-[#1E1611]">
          My Active Runs ({activeRuns.length})
        </h2>

        {activeRuns.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-[#FAF7F2] border border-[#E8DEC9] text-xs text-[#7E7063]">
            Accept a run above to start a rescue.
          </div>
        ) : (
          <div className="space-y-3">
            {activeRuns.map((claim) => {
              const donation = donations.find((d) => d.id === claim.donation_id);
              const tracking = trackingRecords.find((t) => t.donation_request_id === claim.id);

              return (
                <div
                  key={claim.id}
                  className="p-4 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#2D6A4F]">
                      {tracking?.pickup_status === 'VERIFIED' ? 'Completed' : 'En route'}
                    </span>
                    <h3 className="font-display font-bold text-sm text-[#1E1611]">
                      {donation?.title || 'Rescue run'}
                    </h3>
                    <p className="text-[11px] text-[#7E7063] mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#D97706]" />
                        {donation?.pickup_address}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Receiver: {claim.receiver_name}</span>
                    </p>
                  </div>

                  {tracking && (
                    <button
                      type="button"
                      onClick={() => onOpenTracking(tracking.id)}
                      className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 shrink-0"
                    >
                      {tracking.pickup_status === 'VERIFIED' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      {tracking.pickup_status === 'VERIFIED' ? 'View Receipt' : 'Show One-Time Code'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed runs */}
      {completedRuns.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-display font-bold text-lg text-[#1E1611]">
            Completed Rescues ({completedRuns.length})
          </h2>
          <div className="space-y-2">
            {completedRuns.map((claim) => {
              const donation = donations.find((d) => d.id === claim.donation_id);
              const tracking = trackingRecords.find((t) => t.donation_request_id === claim.id);
              return (
                <div
                  key={claim.id}
                  className="p-3 rounded-xl bg-[#E8F5EE] border border-[#2D6A4F]/20 flex items-center justify-between gap-3 text-xs"
                >
                  <span className="flex items-center gap-2 text-[#2D6A4F] font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    {donation?.title || 'Rescue'}
                  </span>
                  {tracking && (
                    <button
                      type="button"
                      onClick={() => onOpenTracking(tracking.id)}
                      className="text-[11px] font-semibold text-[#2D6A4F] hover:underline"
                    >
                      View receipt
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
