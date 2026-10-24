import React, { useState } from 'react';
import { useStore } from '../domain/store.tsx';
import { Role } from '../types/index.ts';
import {
  Users,
  ShieldCheck,
  Package,
  Truck,
  CheckCircle2,
  Search,
  Filter,
  UserX,
  UserCheck,
  History,
  RotateCcw,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    users,
    donations,
    claims,
    trackingRecords,
    auditLogs,
    toggleUserStatus,
    changeUserRole,
    resetToDemoData,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Real database aggregates (Section 6.3 & 10.5)
  const totalUsers = users.length;
  const availableDonations = donations.filter((d) => d.status === 'AVAILABLE').length;
  const pendingClaims = claims.filter((c) => c.status === 'PENDING').length;
  const activePickups = trackingRecords.filter((t) => t.pickup_status === 'EN_ROUTE').length;
  const completedRescues = donations.filter((d) => d.status === 'PICKED_UP').length;

  const filteredUsers = users.filter((u) => {
    const matchQuery =
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.organization_name && u.organization_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && u.is_active) ||
      (statusFilter === 'suspended' && !u.is_active);

    return matchQuery && matchRole && matchStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DEC9]">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[#BA181B] font-bold">
            Administrative Oversight
          </span>
          <h1 className="font-display font-extrabold text-2xl text-[#1E1611] tracking-tight mt-0.5">
            Platform Operator Console
          </h1>
          <p className="text-xs text-[#7E7063] mt-1">
            Real platform metrics, user access controls, and atomic state audit logs.
          </p>
        </div>

        <button
          onClick={resetToDemoData}
          className="px-3.5 py-2 rounded-xl border border-[#E8DEC9] bg-white text-xs font-medium text-[#4E4035] hover:bg-[#F3ECE1] transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Demo State
        </button>
      </div>

      {/* Aggregate KPI Strip (Tabular Figures) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs">
          <span className="text-xs text-[#7E7063] block font-medium">Registered Users</span>
          <span className="font-display font-extrabold text-2xl text-[#1E1611] tabular-nums mt-1 block">
            {totalUsers}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs">
          <span className="text-xs text-[#7E7063] block font-medium">Available Surplus</span>
          <span className="font-display font-extrabold text-2xl text-[#D97706] tabular-nums mt-1 block">
            {availableDonations}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs">
          <span className="text-xs text-[#7E7063] block font-medium">Pending Claims</span>
          <span className="font-display font-extrabold text-2xl text-[#1E1611] tabular-nums mt-1 block">
            {pendingClaims}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs">
          <span className="text-xs text-[#7E7063] block font-medium">Active Pickups</span>
          <span className="font-display font-extrabold text-2xl text-[#2563EB] tabular-nums mt-1 block">
            {activePickups}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E8DEC9] shadow-xs col-span-2 lg:col-span-1">
          <span className="text-xs text-[#7E7063] block font-medium">Rescued & Verified</span>
          <span className="font-display font-extrabold text-2xl text-[#2D6A4F] tabular-nums mt-1 block">
            {completedRescues}
          </span>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-white rounded-3xl border border-[#E8DEC9] shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[#E8DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-lg text-[#1E1611]">
              User Accounts & Role Permissions
            </h2>
            <p className="text-xs text-[#7E7063] mt-0.5">
              Review accounts, change verified roles, or suspend abusive profiles.
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#7E7063]" />
              <input
                type="text"
                placeholder="Search name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="DONOR">Donors</option>
              <option value="RECEIVER">Receivers</option>
              <option value="ADMIN">Admins</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E8DEC9] bg-[#FAF7F2] text-xs text-[#1E1611] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#7E7063] uppercase font-mono text-[10px] border-b border-[#E8DEC9]">
              <tr>
                <th className="py-3 px-5">User</th>
                <th className="py-3 px-5">Organization</th>
                <th className="py-3 px-5">Role</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DEC9]/60">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                  <td className="py-3 px-5">
                    <span className="font-bold text-[#1E1611] block">{user.full_name}</span>
                    <span className="text-[11px] text-[#7E7063] font-mono">{user.email}</span>
                  </td>

                  <td className="py-3 px-5 text-[#4E4035]">
                    {user.organization_name || 'Individual'}
                  </td>

                  <td className="py-3 px-5">
                    <select
                      value={user.role}
                      onChange={(e) => changeUserRole(user.id, e.target.value as Role)}
                      className={`font-mono text-[11px] font-semibold rounded-md px-2 py-1 border border-[#E8DEC9] bg-white ${
                        user.role === 'DONOR'
                          ? 'text-[#D97706]'
                          : user.role === 'RECEIVER'
                          ? 'text-[#2D6A4F]'
                          : 'text-[#BA181B]'
                      }`}
                    >
                      <option value="DONOR">DONOR</option>
                      <option value="RECEIVER">RECEIVER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>

                  <td className="py-3 px-5">
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        user.is_active ? 'text-[#2D6A4F]' : 'text-[#BA181B]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          user.is_active ? 'bg-[#2D6A4F]' : 'bg-[#BA181B]'
                        }`}
                      />
                      {user.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>

                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => toggleUserStatus(user.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        user.is_active
                          ? 'text-[#BA181B] hover:bg-[#FDF0ED]'
                          : 'text-[#2D6A4F] hover:bg-[#E8F5EE]'
                      }`}
                    >
                      {user.is_active ? 'Suspend Account' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security & Audit Events Stream */}
      <div className="bg-white rounded-3xl border border-[#E8DEC9] shadow-xs p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-[#D97706]" />
          <h2 className="font-display font-bold text-base text-[#1E1611]">
            Authoritative Event Audit Trail
          </h2>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E8DEC9] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
            >
              <div>
                <span className="font-mono font-bold text-[#1E1611] mr-2">[{log.action}]</span>
                <span className="text-[#4E4035]">{log.details}</span>
              </div>
              <div className="text-[10px] font-mono text-[#7E7063] whitespace-nowrap">
                Actor: {log.actor_name} · {new Date(log.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
