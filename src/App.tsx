import React, { useState } from 'react';
import { StoreProvider, useStore } from './domain/store.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DonationCard } from './components/DonationCard.tsx';
import { MapView } from './components/MapView.tsx';
import { DonationDetailModal } from './components/DonationDetailModal.tsx';
import { CreateDonationModal } from './components/CreateDonationModal.tsx';
import { DonorClaimsReviewModal } from './components/DonorClaimsReviewModal.tsx';
import { PickupTrackingModal } from './components/PickupTrackingModal.tsx';
import { ChatModal } from './components/ChatModal.tsx';
import { NotificationsModal } from './components/NotificationsModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { VerifyHandoverModal } from './components/VerifyHandoverModal.tsx';
import { MyRequestsView } from './components/MyRequestsView.tsx';
import { MyDonationsView } from './components/MyDonationsView.tsx';
import { ToastContainer } from './components/Toast.tsx';
import { Donation } from './types/index.ts';
import {
  Search,
  Filter,
  Sparkles,
  MapPin,
  Clock,
  HeartHandshake,
  ShieldCheck,
  AlertCircle,
  Truck,
  ArrowRight,
  Package,
  MessageSquare,
} from 'lucide-react';

const FoodSaverApp: React.FC = () => {
  const {
    currentUser,
    donations,
    categories,
    claims,
    trackingRecords,
    requestedReviewDonationId,
    setRequestedReviewDonationId,
  } = useStore();

  const [currentTab, setCurrentTab] = useState<'feed' | 'map' | 'my-claims' | 'my-donations' | 'admin'>('feed');

  // React to toast action to review claim
  React.useEffect(() => {
    if (requestedReviewDonationId) {
      const found = donations.find((d) => d.id === requestedReviewDonationId);
      if (found) {
        setReviewDonation(found);
        setSelectedDonation(null);
      }
      setRequestedReviewDonationId(null);
    }
  }, [requestedReviewDonationId, donations, setRequestedReviewDonationId]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterEmergencyOnly, setFilterEmergencyOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'available' | 'all'>('available');

  // Modal states
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [reviewDonation, setReviewDonation] = useState<Donation | null>(null);
  const [isCreatingDonation, setIsCreatingDonation] = useState(false);
  const [activeTrackingId, setActiveTrackingId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatDonation, setChatDonation] = useState<Donation | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isVerifyHandoverOpen, setIsVerifyHandoverOpen] = useState(false);
  const [verifyDonationId, setVerifyDonationId] = useState<string | null>(null);

  // Active tracking record for map or banners
  const currentActiveTracking = trackingRecords.find(
    (t) =>
      t.pickup_status === 'EN_ROUTE' &&
      (t.receiver_id === currentUser?.id || t.donor_id === currentUser?.id)
  );

  // Filter donations
  const filteredDonations = donations.filter((d) => {
    // Status
    if (statusFilter === 'available' && d.status !== 'AVAILABLE') return false;

    // Emergency
    if (filterEmergencyOnly && !d.is_emergency) return false;

    // Category
    if (selectedCategory !== 'all' && d.category_id !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchDesc = d.description.toLowerCase().includes(q);
      const matchOrg = (d.donor_org || d.donor_name).toLowerCase().includes(q);
      const matchAddress = d.pickup_address.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchOrg && !matchAddress) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2C241E]">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenCreateDonation={() => setIsCreatingDonation(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenChat={() => {
          setChatDonation(null);
          setIsChatOpen(true);
        }}
        onOpenVerifyHandover={() => {
          setVerifyDonationId(null);
          setIsVerifyHandoverOpen(true);
        }}
      />

      {/* Active Transit Banner (if current user has an ongoing pickup) */}
      {currentActiveTracking && (
        <div className="bg-[#2D6A4F] text-white px-4 py-2.5 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FEF3C7] animate-pulse" />
              <span>
                <strong>Pickup in Transit:</strong> {currentActiveTracking.pickup_person_name} is en route.
              </span>
            </div>
            <button
              onClick={() => {
                if (currentUser?.role === 'DONOR') {
                  setVerifyDonationId(currentActiveTracking.donation_id);
                  setIsVerifyHandoverOpen(true);
                } else {
                  setActiveTrackingId(currentActiveTracking.id);
                }
              }}
              className="underline font-bold hover:text-[#FEF3C7] transition-colors"
            >
              {currentUser?.role === 'DONOR' ? 'Verify Handover Code →' : 'Show Handover Code →'}
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: Discover Feed */}
        {currentTab === 'feed' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Hero Section with High-Fidelity Asset */}
            <div className="relative rounded-3xl bg-[#1E1611] text-[#FAF7F2] overflow-hidden shadow-md">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#D97706] mb-3 font-semibold">
                    <span>Zero Food Waste</span>
                    <span aria-hidden="true">·</span>
                    <span>Verified Peer-to-Peer Rescue</span>
                  </div>

                  <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white leading-[1.15]" style={{ textWrap: 'balance' }}>
                    Rescue Edible Surplus Food. Feed Communities.
                  </h1>

                  <p className="mt-4 text-sm sm:text-base text-[#D5C9B5] leading-relaxed max-w-xl">
                    FoodSaver connects artisan bakeries, bistros, and grocers with local receivers and food pantries. Fast discovery, atomic claim arbitration, and verified 6-digit handovers.
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setCurrentTab('map')}
                      className="px-5 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      Explore Live Map
                    </button>

                    {currentUser?.role === 'DONOR' ? (
                      <button
                        onClick={() => setIsCreatingDonation(true)}
                        className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-colors"
                      >
                        + Post Surplus Food
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const el = document.getElementById('search-anchor');
                          el?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-colors"
                      >
                        Browse Available Food
                      </button>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 relative min-h-[260px] lg:min-h-full">
                  <img
                    src="/src/assets/images/hero_surplus_food_1792770776138.jpg"
                    alt="Community food rescue with fresh bakery and produce crates"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#1E1611] via-transparent to-transparent opacity-80" />
                </div>
              </div>
            </div>

            {/* Filter and Discovery Bar */}
            <div id="search-anchor" className="space-y-4 pt-2">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#7E7063]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by food title, bakery, address..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E8DEC9] bg-white text-xs text-[#1E1611] placeholder:text-[#7E7063] focus:outline-none focus:ring-1 focus:ring-[#D97706] shadow-2xs"
                  />
                </div>

                {/* Status & Emergency Toggles */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilterEmergencyOnly(!filterEmergencyOnly)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                      filterEmergencyOnly
                        ? 'bg-[#FDF0ED] border-[#BA181B] text-[#BA181B]'
                        : 'bg-white border-[#E8DEC9] text-[#7E7063] hover:text-[#1E1611]'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-[#BA181B]" />
                    Urgent Alert Only
                  </button>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'available' | 'all')}
                    className="px-3 py-2 rounded-xl border border-[#E8DEC9] bg-white text-xs text-[#1E1611] font-medium focus:outline-none"
                  >
                    <option value="available">Available Listings</option>
                    <option value="all">All (Including Reserved)</option>
                  </select>
                </div>
              </div>

              {/* Functional Category Filter Tabs (Zero-pill button controls with click handlers) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-[#1E1611] text-white shadow-xs'
                      : 'bg-white text-[#4E4035] hover:bg-[#F3ECE1] border border-[#E8DEC9]'
                  }`}
                >
                  All Food ({donations.length})
                </button>

                {categories.map((cat) => {
                  const count = donations.filter((d) => d.category_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-[#1E1611] text-white shadow-xs'
                          : 'bg-white text-[#4E4035] hover:bg-[#F3ECE1] border border-[#E8DEC9]'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Donation Cards Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-xl text-[#1E1611]">
                  Available Surplus Nearby ({filteredDonations.length})
                </h2>
                <span className="text-xs text-[#7E7063]">
                  Showing free surplus for direct community pickup
                </span>
              </div>

              {filteredDonations.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white border border-[#E8DEC9]">
                  <p className="text-sm font-semibold text-[#1E1611]">No surplus matching your filters</p>
                  <p className="text-xs text-[#7E7063] mt-1">
                    Try clearing search criteria or checking the live map.
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setFilterEmergencyOnly(false);
                      setStatusFilter('available');
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DEC9] text-xs font-medium text-[#1E1611]"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDonations.map((donation) => (
                    <DonationCard
                      key={donation.id}
                      donation={donation}
                      onSelect={(d) => setSelectedDonation(d)}
                      onClaim={(d) => setSelectedDonation(d)}
                      onManageClaims={(d) => setReviewDonation(d)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Interactive Leaflet Map */}
        {currentTab === 'map' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display font-extrabold text-2xl text-[#1E1611] tracking-tight">
                  Surplus Food Map
                </h1>
                <p className="text-xs text-[#7E7063] mt-0.5">
                  Discover local bakeries, bistros, and grocers with food ready for pickup.
                </p>
              </div>
            </div>

            <MapView
              onSelectDonation={(d) => setSelectedDonation(d)}
              activeTracking={currentActiveTracking}
            />
          </div>
        )}

        {/* TAB 3: Receiver Requests */}
        {currentTab === 'my-claims' && (
          <MyRequestsView
            onOpenTracking={(id) => setActiveTrackingId(id)}
            onOpenChat={(donation) => {
              setChatDonation(donation);
              setIsChatOpen(true);
            }}
          />
        )}

        {/* TAB 4: Donor Listings */}
        {currentTab === 'my-donations' && (
          <MyDonationsView
            onOpenCreate={() => setIsCreatingDonation(true)}
            onSelectDonation={(d) => setSelectedDonation(d)}
            onManageClaims={(d) => setReviewDonation(d)}
            onOpenTracking={(id) => setActiveTrackingId(id)}
            onVerifyHandover={(donationId) => {
              setVerifyDonationId(donationId);
              setIsVerifyHandoverOpen(true);
            }}
          />
        )}

        {/* TAB 5: Platform Admin */}
        {currentTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Mobile Bottom Navigation Bar (Section 7.4) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-t border-[#E8DEC9] px-2 py-1.5 flex items-center justify-around text-[10px] font-medium"
      >
        <button
          onClick={() => setCurrentTab('feed')}
          className={`flex flex-col items-center gap-1 p-1 transition-colors ${
            currentTab === 'feed' ? 'text-[#D97706] font-bold' : 'text-[#7E7063]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Discover</span>
        </button>

        <button
          onClick={() => setCurrentTab('map')}
          className={`flex flex-col items-center gap-1 p-1 transition-colors ${
            currentTab === 'map' ? 'text-[#D97706] font-bold' : 'text-[#7E7063]'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Live Map</span>
        </button>

        {currentUser?.role === 'DONOR' ? (
          <button
            onClick={() => setCurrentTab('my-donations')}
            className={`flex flex-col items-center gap-1 p-1 transition-colors ${
              currentTab === 'my-donations' ? 'text-[#D97706] font-bold' : 'text-[#7E7063]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Listings</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentTab('my-claims')}
            className={`flex flex-col items-center gap-1 p-1 transition-colors ${
              currentTab === 'my-claims' ? 'text-[#D97706] font-bold' : 'text-[#7E7063]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Requests</span>
          </button>
        )}

        <button
          onClick={() => {
            setChatDonation(null);
            setIsChatOpen(true);
          }}
          className="flex flex-col items-center gap-1 p-1 text-[#7E7063] transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Messages</span>
        </button>

        {currentUser?.role === 'ADMIN' && (
          <button
            onClick={() => setCurrentTab('admin')}
            className={`flex flex-col items-center gap-1 p-1 transition-colors ${
              currentTab === 'admin' ? 'text-[#BA181B] font-bold' : 'text-[#7E7063]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>
        )}
      </nav>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#E8DEC9] bg-white py-6 pb-20 md:pb-6 text-xs text-[#7E7063]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[#1E1611]">FoodSaver</span>
            <span>· Peer-to-Peer Community Surplus Coordination · Free & Non-Profit</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>San Francisco Community Pilot</span>
            <span>·</span>
            <span>Safe Handover Verification</span>
            <span>·</span>
            <span>Zero Waste</span>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <DonationDetailModal
        donation={selectedDonation}
        onClose={() => setSelectedDonation(null)}
        onOpenManageClaims={(d) => {
          setSelectedDonation(null);
          setReviewDonation(d);
        }}
        onOpenChat={(d) => {
          setSelectedDonation(null);
          setChatDonation(d);
          setIsChatOpen(true);
        }}
      />

      <DonorClaimsReviewModal
        donation={reviewDonation}
        onClose={() => setReviewDonation(null)}
        onOpenTracking={(id) => {
          setReviewDonation(null);
          setActiveTrackingId(id);
        }}
        onOpenVerifyHandover={(donationId) => {
          setReviewDonation(null);
          setVerifyDonationId(donationId);
          setIsVerifyHandoverOpen(true);
        }}
      />

      {isCreatingDonation && (
        <CreateDonationModal
          onClose={() => setIsCreatingDonation(false)}
          onSuccess={(id) => {
            setIsCreatingDonation(false);
            setCurrentTab('my-donations');
          }}
        />
      )}

      {activeTrackingId && (
        <PickupTrackingModal
          trackingId={activeTrackingId}
          onClose={() => setActiveTrackingId(null)}
        />
      )}

      {isChatOpen && (
        <ChatModal
          onClose={() => {
            setIsChatOpen(false);
            setChatDonation(null);
          }}
          initialDonationId={chatDonation?.id}
          initialOtherUserId={chatDonation?.donor_id}
        />
      )}

      {isNotificationsOpen && (
        <NotificationsModal
          onClose={() => setIsNotificationsOpen(false)}
          onNavigateTo={(type, id) => {
            setIsNotificationsOpen(false);
            if (type === 'claims' || type === 'donation') {
              const d = donations.find((x) => x.id === id);
              if (d) setReviewDonation(d);
            } else if (type === 'requests') {
              setCurrentTab('my-claims');
            } else if (type === 'tracking') {
              const trk = trackingRecords.find((t) => t.id === id || t.donation_request_id === id);
              if (trk) setActiveTrackingId(trk.id);
            }
          }}
        />
      )}

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}

      {isVerifyHandoverOpen && (
        <VerifyHandoverModal
          initialDonationId={verifyDonationId}
          onClose={() => {
            setIsVerifyHandoverOpen(false);
            setVerifyDonationId(null);
          }}
        />
      )}

      {/* Floating Mock Notification Toast Stack */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <FoodSaverApp />
    </StoreProvider>
  );
}
