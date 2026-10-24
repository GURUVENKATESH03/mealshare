import React, { useState } from 'react';
import { useStore } from '../domain/store.tsx';
import { X, UserCheck, HeartHandshake, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { users, loginAs, signUp } = useStore();
  const [tab, setTab] = useState<'signin' | 'signup' | 'personas'>('signin');

  // Sign up state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orgName, setOrgName] = useState('');
  // Strictly DONOR or RECEIVER only! Spec 3.1 & 15: Public signup cannot assign ADMIN
  const [role, setRole] = useState<'DONOR' | 'RECEIVER'>('RECEIVER');
  const [address, setAddress] = useState('742 Folsom St');
  const [city, setCity] = useState('San Francisco');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const res = signUp({
      full_name: fullName,
      email,
      phone_number: phone,
      organization_name: orgName || undefined,
      role,
      address,
      city,
    });

    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to sign up.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#E8DEC9] shadow-2xl p-6 sm:p-8 my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#F3ECE1] text-[#7E7063] transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#2D6A4F] text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h2 id="auth-title" className="font-display font-bold text-xl text-[#1E1611]">
            FoodSaver Account
          </h2>
          <p className="text-xs text-[#7E7063] mt-0.5">
            Peer-to-peer surplus food coordination platform
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 bg-[#FAF7F2] rounded-xl border border-[#E8DEC9] mb-5 text-xs font-semibold">
          <button
            onClick={() => setTab('signin')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              tab === 'signin' ? 'bg-white text-[#1E1611] shadow-xs' : 'text-[#7E7063]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('signup')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              tab === 'signup' ? 'bg-white text-[#1E1611] shadow-xs' : 'text-[#7E7063]'
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => setTab('personas')}
            className={`flex-1 py-1.5 rounded-lg transition-colors ${
              tab === 'personas' ? 'bg-white text-[#D97706] shadow-xs' : 'text-[#7E7063]'
            }`}
          >
            Demo Users
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-[#FDF0ED] border border-[#BA181B]/20 text-[#BA181B] text-xs">
            {errorMsg}
          </div>
        )}

        {/* Tab 1: Sign In */}
        {tab === 'signin' && (
          <div className="space-y-3">
            <p className="text-xs text-[#4E4035]">Select an existing account to sign in immediately:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    loginAs(u.id);
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] hover:bg-[#F3ECE1] text-left text-xs flex items-center justify-between transition-colors"
                >
                  <div>
                    <span className="font-bold text-[#1E1611] block">{u.full_name}</span>
                    <span className="text-[11px] text-[#7E7063] block font-mono">{u.email}</span>
                  </div>
                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      u.role === 'DONOR'
                        ? 'text-[#D97706] bg-[#FEF3C7]'
                        : u.role === 'RECEIVER'
                        ? 'text-[#2D6A4F] bg-[#E8F5EE]'
                        : 'text-[#BA181B] bg-[#FDF0ED]'
                    }`}
                  >
                    {u.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Create Account */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#1E1611] mb-1">
                Your Role *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('RECEIVER')}
                  className={`p-2 rounded-xl border text-xs font-semibold text-center transition-colors ${
                    role === 'RECEIVER'
                      ? 'border-[#2D6A4F] bg-[#E8F5EE] text-[#2D6A4F]'
                      : 'border-[#E8DEC9] bg-[#FAF7F2] text-[#7E7063]'
                  }`}
                >
                  RECEIVER (Claim food)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('DONOR')}
                  className={`p-2 rounded-xl border text-xs font-semibold text-center transition-colors ${
                    role === 'DONOR'
                      ? 'border-[#D97706] bg-[#FEF3C7] text-[#D97706]'
                      : 'border-[#E8DEC9] bg-[#FAF7F2] text-[#7E7063]'
                  }`}
                >
                  DONOR (Offer food)
                </button>
              </div>
              <p className="text-[10px] text-[#7E7063] mt-1">
                * Note: Admin accounts cannot be created by public signup.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1611] mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-3 py-1.5 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1611] mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.org"
                className="w-full px-3 py-1.5 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1611] mb-1">Phone Number (Private) *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="415-555-0100"
                className="w-full px-3 py-1.5 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E1611] mb-1">Organization / Shelter (Optional)</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Mission Outreach Pantry"
                className="w-full px-3 py-1.5 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 rounded-xl bg-[#2D6A4F] hover:bg-[#1B4332] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Register Account
            </button>
          </form>
        )}

        {/* Tab 3: Demo Personas */}
        {tab === 'personas' && (
          <div className="space-y-2.5">
            <p className="text-xs text-[#4E4035]">
              Quick 1-click test personas to inspect each side of the handover workflow:
            </p>
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  loginAs(u.id);
                  onClose();
                }}
                className="w-full p-3 rounded-xl border border-[#E8DEC9] bg-white hover:bg-[#FAF7F2] text-left text-xs flex items-center justify-between transition-colors shadow-2xs"
              >
                <div>
                  <div className="font-bold text-[#1E1611]">{u.full_name}</div>
                  <div className="text-[11px] text-[#7E7063]">
                    {u.organization_name || 'Individual'} · {u.address}
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-1 rounded ${
                    u.role === 'DONOR'
                      ? 'text-[#D97706] bg-[#FEF3C7]'
                      : u.role === 'RECEIVER'
                      ? 'text-[#2D6A4F] bg-[#E8F5EE]'
                      : 'text-[#BA181B] bg-[#FDF0ED]'
                  }`}
                >
                  {u.role}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
