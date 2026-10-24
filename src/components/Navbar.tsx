import React, { useState } from 'react';
import { useStore } from '../domain/store.tsx';
import {
  HeartHandshake,
  MapPin,
  Compass,
  Package,
  MessageSquare,
  Bell,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  LogOut,
  PlusCircle,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'feed' | 'map' | 'my-claims' | 'my-donations' | 'admin';
  setCurrentTab: (tab: 'feed' | 'map' | 'my-claims' | 'my-donations' | 'admin') => void;
  onOpenCreateDonation: () => void;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  onOpenChat: () => void;
  onOpenVerifyHandover?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenCreateDonation,
  onOpenNotifications,
  onOpenAuth,
  onOpenChat,
  onOpenVerifyHandover,
}) => {
  const { currentUser, users, donations, claims, loginAs, logout, unreadNotificationsCount } = useStore();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const hasPendingHandovers =
    currentUser?.role === 'DONOR' &&
    donations.some(
      (d) =>
        d.donor_id === currentUser.id &&
        (d.status === 'RESERVED' || claims.some((c) => c.donation_id === d.id && c.status === 'APPROVED'))
    );

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DEC9] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (1 single text element) */}
        <button
          onClick={() => setCurrentTab('feed')}
          className="flex items-center gap-2.5 text-left text-xl font-bold tracking-tight text-[#1E1611] whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
          aria-label="FoodSaver Home"
        >
          <span className="w-9 h-9 rounded-xl bg-[#2D6A4F] text-[#FAF7F2] flex items-center justify-center shadow-sm">
            <HeartHandshake className="w-5 h-5" />
          </span>
          <span className="font-display tracking-tight text-xl font-extrabold text-[#1E1611]">
            Food<span className="text-[#D97706]">Saver</span>
          </span>
        </button>

        {/* Zone 2: Clean 4–5 single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#4E4035]">
          <button
            onClick={() => setCurrentTab('feed')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'feed'
                ? 'text-[#1E1611] font-semibold border-b-2 border-[#D97706]'
                : 'text-[#4E4035] hover:text-[#1E1611]'
            }`}
          >
            Discover Food
          </button>

          <button
            onClick={() => setCurrentTab('map')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
              currentTab === 'map'
                ? 'text-[#1E1611] font-semibold border-b-2 border-[#D97706]'
                : 'text-[#4E4035] hover:text-[#1E1611]'
            }`}
          >
            <MapPin className="w-4 h-4 text-[#D97706]" />
            Live Map
          </button>

          {currentUser?.role === 'DONOR' ? (
            <button
              onClick={() => setCurrentTab('my-donations')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                currentTab === 'my-donations'
                  ? 'text-[#1E1611] font-semibold border-b-2 border-[#D97706]'
                  : 'text-[#4E4035] hover:text-[#1E1611]'
              }`}
            >
              My Listings
            </button>
          ) : (
            <button
              onClick={() => setCurrentTab('my-claims')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
                currentTab === 'my-claims'
                  ? 'text-[#1E1611] font-semibold border-b-2 border-[#D97706]'
                  : 'text-[#4E4035] hover:text-[#1E1611]'
              }`}
            >
              My Requests
            </button>
          )}

          <button
            onClick={onOpenChat}
            className="whitespace-nowrap shrink-0 transition-colors py-1 hover:text-[#1E1611]"
          >
            Messages
          </button>

          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => setCurrentTab('admin')}
              className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
                currentTab === 'admin'
                  ? 'text-[#BA181B] font-semibold border-b-2 border-[#BA181B]'
                  : 'text-[#4E4035] hover:text-[#BA181B]'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Platform Admin
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Action & Quick Persona Switcher */}
        <div className="flex items-center gap-2.5 shrink-0">
          {currentUser?.role === 'DONOR' && hasPendingHandovers && (
            <button
              onClick={onOpenVerifyHandover}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2D6A4F] hover:bg-[#1B4332] rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify Handover</span>
            </button>
          )}

          {currentUser?.role === 'DONOR' && (
            <button
              onClick={onOpenCreateDonation}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#D97706] rounded-lg hover:bg-[#B45309] transition-colors shadow-sm whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Post Surplus
            </button>
          )}

          {/* Notifications bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-[#4E4035] hover:bg-[#F3ECE1] hover:text-[#1E1611] transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#BA181B] rounded-full" />
            )}
          </button>

          {/* User / Persona menu */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 rounded-lg border border-[#E8DEC9] bg-white hover:bg-[#F3ECE1]/60 transition-colors text-xs font-medium text-[#1E1611]"
                aria-expanded={showPersonaMenu}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    currentUser.role === 'DONOR'
                      ? 'bg-[#D97706]'
                      : currentUser.role === 'RECEIVER'
                      ? 'bg-[#2D6A4F]'
                      : 'bg-[#BA181B]'
                  }`}
                />
                <span className="font-medium max-w-[85px] sm:max-w-[110px] truncate">{currentUser.full_name}</span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-[#FAF7F2] text-[#7E7063]">
                  {currentUser.role}
                </span>
                <ChevronDown className="w-3 h-3 text-[#7E7063] shrink-0" />
              </button>

              {showPersonaMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-white border border-[#E8DEC9] shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  onClick={() => setShowPersonaMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-[#E8DEC9]/60">
                    <p className="text-xs font-semibold text-[#1E1611]">{currentUser.full_name}</p>
                    <p className="text-[11px] text-[#7E7063] truncate">{currentUser.email}</p>
                    {currentUser.organization_name && (
                      <p className="text-[11px] text-[#2D6A4F] font-medium mt-0.5">
                        {currentUser.organization_name}
                      </p>
                    )}
                  </div>

                  <div className="px-3 py-1.5">
                    <p className="text-[10px] uppercase tracking-wider font-mono text-[#7E7063] mb-1">
                      Quick Switch Test Persona:
                    </p>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => loginAs(u.id)}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors ${
                          u.id === currentUser.id
                            ? 'bg-[#F3ECE1] text-[#1E1611] font-semibold'
                            : 'text-[#4E4035] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="truncate block">{u.full_name}</span>
                          <span className="text-[10px] text-[#7E7063] block">
                            {u.organization_name || u.city}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] uppercase font-mono px-1 rounded ${
                            u.role === 'DONOR'
                              ? 'text-[#D97706]'
                              : u.role === 'RECEIVER'
                              ? 'text-[#2D6A4F]'
                              : 'text-[#BA181B]'
                          }`}
                        >
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-[#E8DEC9]/60 px-2 pt-1.5 mt-1 flex flex-col gap-1">
                    <button
                      onClick={onOpenAuth}
                      className="w-full text-left px-2 py-1.5 text-xs text-[#4E4035] hover:bg-[#FAF7F2] rounded-md flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#2D6A4F]" />
                      Sign In / Sign Up
                    </button>
                    <button
                      onClick={logout}
                      className="w-full text-left px-2 py-1.5 text-xs text-[#BA181B] hover:bg-[#FAF7F2] rounded-md flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#1E1611] rounded-lg hover:bg-[#2C241E] transition-colors whitespace-nowrap"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
