import React from 'react';
import { useStore } from '../domain/store.tsx';
import { Donation } from '../types/index.ts';
import { getExpiryRemaining } from '../domain/rules.ts';
import {
  Package,
  PlusCircle,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  AlertCircle,
  Truck,
  ShieldCheck,
} from 'lucide-react';

interface MyDonationsViewProps {
  onOpenCreate: () => void;
  onSelectDonation: (donation: Donation) => void;
  onManageClaims: (donation: Donation) => void;
  onOpenTracking: (trackingId: string) => void;
  onVerifyHandover?: (donationId: string) => void;
}

export const MyDonationsView: React.FC<MyDonationsViewProps> = ({
  onOpenCreate,
  onSelectDonation,
  onManageClaims,
  onOpenTracking,
  onVerifyHandover,
}) => {
  const { currentUser, donations, claims, trackingRecords, cancelDonation } = useStore();

  const myDonations = donations.filter((d) => d.donor_id === currentUser?.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#D97706] font-bold">
            Donor Dashboard
          </span>
          <h1 className="font-display font-extrabold text-2xl text-[#1E1611] tracking-tight mt-0.5">
            My Surplus Listings
          </h1>
          <p className="text-xs text-[#7E7063] mt-1">
            Review incoming claims, approve single recipients, and verify handovers.
          </p>
        </div>

        <button
          onClick={onOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Post New Surplus
        </button>
      </div>

      {myDonations.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#E8DEC9]">
          <Package className="w-10 h-10 text-[#D97706] mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-[#1E1611]">No surplus listings yet</h3>
          <p className="text-xs text-[#7E7063] mt-1 max-w-sm mx-auto mb-4">
            Have surplus bread, prepared meals, or fresh produce? Post a listing to offer it to nearby community groups.
          </p>
          <button
            onClick={onOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-[#D97706] text-white text-xs font-semibold"
          >
            Create Your First Listing
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {myDonations.map((donation) => {
            const expiry = getExpiryRemaining(donation.expiry_time);
            const donationClaims = claims.filter((c) => c.donation_id === donation.id);
            const pendingCount = donationClaims.filter((c) => c.status === 'PENDING').length;
            const approvedClaim = donationClaims.find(
              (c) => c.status === 'APPROVED' || c.status === 'COMPLETED'
            );
            const activeTracking = approvedClaim
              ? trackingRecords.find((t) => t.donation_request_id === approvedClaim.id)
              : null;

            return (
              <div
                key={donation.id}
                className="p-5 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                        donation.status === 'AVAILABLE'
                          ? 'bg-[#E8F5EE] text-[#2D6A4F]'
                          : donation.status === 'RESERVED'
                          ? 'bg-[#FEF3C7] text-[#D97706]'
                          : donation.status === 'PICKED_UP'
                          ? 'bg-[#2D6A4F] text-white'
                          : 'bg-[#FDF0ED] text-[#BA181B]'
                      }`}
                    >
                      {donation.status}
                    </span>
                    <span className="text-xs text-[#7E7063]">
                      Quantity: <strong>{donation.quantity} {donation.quantity_unit}</strong>
                    </span>
                  </div>

                  <h3
                    onClick={() => onSelectDonation(donation)}
                    className="font-display font-bold text-lg text-[#1E1611] hover:text-[#D97706] cursor-pointer"
                  >
                    {donation.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#4E4035]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#BA181B]" />
                      {expiry.label}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 text-[#7E7063]">
                      <MapPin className="w-3.5 h-3.5 text-[#D97706]" />
                      {donation.pickup_address}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#E8DEC9]/50">
                  <button
                    onClick={() => onManageClaims(donation)}
                    className="px-4 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E8DEC9] text-xs font-semibold text-[#1E1611] flex items-center gap-2 transition-colors"
                  >
                    <Users className="w-4 h-4 text-[#D97706]" />
                    <span>Incoming Claims</span>
                    {pendingCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#D97706] text-white text-[11px] font-mono flex items-center justify-center">
                        {pendingCount}
                      </span>
                    )}
                  </button>

                  {activeTracking && activeTracking.pickup_status !== 'VERIFIED' && (
                    <button
                      onClick={() =>
                        onVerifyHandover
                          ? onVerifyHandover(donation.id)
                          : onOpenTracking(activeTracking.id)
                      }
                      className="px-4 py-2 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Handover</span>
                    </button>
                  )}

                  {activeTracking && activeTracking.pickup_status === 'VERIFIED' && (
                    <button
                      onClick={() => onOpenTracking(activeTracking.id)}
                      className="px-4 py-2 rounded-xl bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E8DEC9] text-[#2D6A4F] text-xs font-semibold shadow-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>View Receipt</span>
                    </button>
                  )}

                  {donation.status === 'AVAILABLE' && (
                    <button
                      onClick={() => cancelDonation(donation.id)}
                      className="px-3 py-2 rounded-xl border border-[#E8DEC9] text-xs text-[#BA181B] hover:bg-[#FDF0ED]"
                    >
                      Cancel Listing
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
