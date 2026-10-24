import React, { useState } from 'react';
import { useStore } from '../domain/store.tsx';
import { X, Clock, MapPin, Package, AlertCircle, Sparkles } from 'lucide-react';

interface CreateDonationModalProps {
  onClose: () => void;
  onSuccess: (donationId: string) => void;
}

export const CreateDonationModal: React.FC<CreateDonationModalProps> = ({ onClose, onSuccess }) => {
  const { currentUser, categories, createDonation } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat-bakery');
  const [quantity, setQuantity] = useState('15');
  const [quantityUnit, setQuantityUnit] = useState('portions');
  const [cookedHoursAgo, setCookedHoursAgo] = useState('1');

  // Default expiry to 6 hours from now
  const defaultExpiry = new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 16);
  const [expiryTime, setExpiryTime] = useState(defaultExpiry);

  const [pickupAddress, setPickupAddress] = useState(currentUser?.address || '428 Valencia St');
  const [city, setCity] = useState(currentUser?.city || 'San Francisco');
  const [storageNotes, setStorageNotes] = useState('Keep refrigerated or ambient as marked. Insulated tote recommended.');
  const [isEmergency, setIsEmergency] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categoryImages: Record<string, string> = {
    'cat-bakery': '/src/assets/images/category_bakery_fresh_1792770776700.jpg',
    'cat-prepared': '/src/assets/images/category_prepared_meals_1792770777342.jpg',
    'cat-produce': '/src/assets/images/category_produce_crates_1792770776817.jpg',
    'cat-pantry': '/src/assets/images/hero_surplus_food_1792770776138.jpg',
    'cat-dairy': '/src/assets/images/category_prepared_meals_1792770777342.jpg',
  };

  const [selectedImage, setSelectedImage] = useState(categoryImages[categoryId]);

  const handleCategoryChange = (catId: string) => {
    setCategoryId(catId);
    if (categoryImages[catId]) {
      setSelectedImage(categoryImages[catId]);
    }
  };

  const handleQuickExpiry = (hours: number) => {
    const d = new Date(Date.now() + hours * 3600 * 1000);
    setExpiryTime(d.toISOString().slice(0, 16));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please provide a listing title.');
      return;
    }
    if (!quantity.trim()) {
      setErrorMsg('Please specify the quantity.');
      return;
    }

    const expiryDate = new Date(expiryTime);
    if (isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
      setErrorMsg('Pickup deadline must be in the future.');
      return;
    }

    const cookedTimeIso = cookedHoursAgo
      ? new Date(Date.now() - Number(cookedHoursAgo) * 3600 * 1000).toISOString()
      : undefined;

    const res = createDonation({
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId,
      quantity: quantity.trim(),
      quantity_unit: quantityUnit.trim(),
      cooked_time: cookedTimeIso,
      expiry_time: expiryDate.toISOString(),
      pickup_address: pickupAddress.trim(),
      city: city.trim(),
      latitude: currentUser?.latitude || 37.7645,
      longitude: currentUser?.longitude || -122.4219,
      image_url: selectedImage,
      is_emergency: isEmergency,
      storage_notes: storageNotes.trim(),
    });

    if (res.success && res.donationId) {
      onSuccess(res.donationId);
    } else {
      setErrorMsg(res.error || 'Failed to create donation listing.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-title"
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
            Donor Coordination
          </span>
          <h2 id="create-title" className="font-display font-bold text-2xl text-[#1E1611] tracking-tight mt-0.5">
            Post Surplus Food
          </h2>
          <p className="text-xs text-[#7E7063] mt-1">
            Offer wholesome surplus to nearby community receivers. Free coordination, zero waste.
          </p>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-[#FDF0ED] border border-[#BA181B]/20 text-[#BA181B] text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#1E1611] mb-1">
              Food Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fresh Artisan Sourdough Boules & Croissants"
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#D97706]"
            />
          </div>

          {/* Category & Quantity Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E1611] mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#D97706]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1611] mb-1">
                Quantity & Unit *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="24"
                  className="w-20 px-3 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none"
                />
                <input
                  type="text"
                  required
                  value={quantityUnit}
                  onChange={(e) => setQuantityUnit(e.target.value)}
                  placeholder="portions / boxes"
                  className="flex-1 px-3 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#1E1611] mb-1">
              Description & Packaging Details
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Prepared in certified commercial kitchen this morning. Packaged in sanitized food-grade cartons."
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#D97706]"
            />
          </div>

          {/* Expiry Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#1E1611]">
                Pickup Expiry Deadline *
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#7E7063]">Quick set:</span>
                <button
                  type="button"
                  onClick={() => handleQuickExpiry(3)}
                  className="px-2 py-0.5 rounded bg-[#F3ECE1] text-[10px] font-medium text-[#4E4035] hover:bg-[#E8DEC9]"
                >
                  +3h
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickExpiry(6)}
                  className="px-2 py-0.5 rounded bg-[#F3ECE1] text-[10px] font-medium text-[#4E4035] hover:bg-[#E8DEC9]"
                >
                  +6h
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickExpiry(12)}
                  className="px-2 py-0.5 rounded bg-[#F3ECE1] text-[10px] font-medium text-[#4E4035] hover:bg-[#E8DEC9]"
                >
                  +12h
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              required
              value={expiryTime}
              onChange={(e) => setExpiryTime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none font-mono"
            />
          </div>

          {/* Pickup Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1E1611] mb-1">
                Pickup Address *
              </label>
              <input
                type="text"
                required
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="428 Valencia St"
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E1611] mb-1">
                City
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Emergency Surplus Flag */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="emergency-flag"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="w-4 h-4 rounded text-[#BA181B] focus:ring-[#BA181B] border-[#E8DEC9]"
            />
            <label htmlFor="emergency-flag" className="text-xs text-[#4E4035] cursor-pointer">
              Mark as <strong className="text-[#BA181B]">Urgent Surplus Alert</strong> (expires within 3h or needs immediate pickup)
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-[#E8DEC9] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#4E4035] hover:text-[#1E1611]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Publish Surplus Listing
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
