import React from 'react';
import { Donation } from '../types/index.ts';
import { useStore } from '../domain/store.tsx';
import { getExpiryRemaining, calculateDistanceKm } from '../domain/rules.ts';
import { MapPin, Clock, AlertCircle, CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';

interface DonationCardProps {
  donation: Donation;
  onSelect: (donation: Donation) => void;
  onClaim?: (donation: Donation) => void;
  onManageClaims?: (donation: Donation) => void;
}

export const DonationCard: React.FC<DonationCardProps> = ({
  donation,
  onSelect,
  onClaim,
  onManageClaims,
}) => {
  const { currentUser, categories, claims } = useStore();

  const category = categories.find((c) => c.id === donation.category_id);
  const expiryInfo = getExpiryRemaining(donation.expiry_time);

  // Distance from current user if coordinates exist
  const distance =
    currentUser?.latitude && currentUser?.longitude
      ? calculateDistanceKm(
          { latitude: currentUser.latitude, longitude: currentUser.longitude },
          { latitude: donation.latitude, longitude: donation.longitude }
        )
      : null;

  const isOwner = currentUser?.id === donation.donor_id;
  const pendingClaimsCount = claims.filter(
    (c) => c.donation_id === donation.id && c.status === 'PENDING'
  ).length;

  const hasMyClaim = claims.some(
    (c) =>
      c.donation_id === donation.id &&
      c.receiver_id === currentUser?.id &&
      (c.status === 'PENDING' || c.status === 'APPROVED')
  );

  return (
    <article className="group bg-white rounded-2xl border border-[#E8DEC9] hover:border-[#D5C9B5] transition-all duration-200 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-sm">
      <div>
        {/* Card Image Cover with Fallback */}
        <div className="relative aspect-16/10 w-full overflow-hidden bg-[#F3ECE1]">
          <img
            src={donation.image_url}
            alt={donation.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            onError={(e) => {
              // Graceful fallback to colored canvas
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />

          {/* Emergency Surplus Banner (if marked emergency) */}
          {donation.is_emergency && (
            <div className="absolute top-3 left-3 bg-[#BA181B] text-white text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Surplus Alert
            </div>
          )}

          {/* Status banner if reserved or picked up */}
          {donation.status === 'RESERVED' && (
            <div className="absolute top-3 right-3 bg-[#1E1611]/85 backdrop-blur-xs text-[#FAF7F2] text-[11px] font-medium px-2.5 py-1 rounded-md">
              Reserved for Pickup
            </div>
          )}

          {donation.status === 'PICKED_UP' && (
            <div className="absolute top-3 right-3 bg-[#2D6A4F] text-white text-[11px] font-medium px-2.5 py-1 rounded-md flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Rescued
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5">
          {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
          <div className="flex items-center gap-1.5 text-xs text-[#7E7063] mb-2 font-medium">
            <span>{category?.name || 'Food Surplus'}</span>
            <span aria-hidden="true">·</span>
            <span>{donation.quantity} {donation.quantity_unit}</span>
            {distance !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[#4E4035]">{distance} km away</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={() => onSelect(donation)}
            className="font-display font-bold text-lg text-[#1E1611] tracking-tight hover:text-[#D97706] transition-colors cursor-pointer line-clamp-1"
          >
            {donation.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-[#4E4035] mt-1.5 line-clamp-2 leading-relaxed">
            {donation.description}
          </p>

          {/* Expiry & Location Row */}
          <div className="mt-4 pt-3 border-t border-[#E8DEC9]/60 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center gap-1.5 font-medium ${
                  expiryInfo.isUrgent
                    ? 'text-[#BA181B] font-semibold'
                    : 'text-[#4E4035]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{expiryInfo.label}</span>
              </div>

              {/* Donor Organization */}
              <span className="text-[#7E7063] truncate max-w-[140px]" title={donation.donor_org || donation.donor_name}>
                {donation.donor_org || donation.donor_name}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[#7E7063] truncate">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#D97706]" />
              <span className="truncate">{donation.pickup_address}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="px-5 pb-5 pt-1">
        {isOwner ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onManageClaims ? onManageClaims(donation) : onSelect(donation)}
              className="flex-1 py-2 px-3 text-xs font-semibold rounded-lg bg-[#FAF7F2] hover:bg-[#F3ECE1] text-[#1E1611] border border-[#E8DEC9] transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Manage Claims</span>
              {pendingClaimsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#D97706] text-white text-[11px] font-mono flex items-center justify-center">
                  {pendingClaimsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onSelect(donation)}
              className="py-2 px-3 text-xs font-medium text-[#4E4035] hover:text-[#1E1611] transition-colors"
            >
              Details
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(donation)}
              className="flex-1 py-2 px-3 text-xs font-medium rounded-lg text-[#4E4035] hover:text-[#1E1611] bg-[#FAF7F2] hover:bg-[#F3ECE1] border border-[#E8DEC9] transition-colors"
            >
              View Listing
            </button>

            {donation.status === 'AVAILABLE' && (
              <button
                onClick={() => (onClaim ? onClaim(donation) : onSelect(donation))}
                disabled={hasMyClaim}
                className={`py-2 px-4 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-xs ${
                  hasMyClaim
                    ? 'bg-[#E8DEC9] text-[#7E7063] cursor-not-allowed'
                    : 'bg-[#2D6A4F] text-white hover:bg-[#1B4332]'
                }`}
              >
                {hasMyClaim ? 'Claim Submitted' : 'Claim Food'}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
