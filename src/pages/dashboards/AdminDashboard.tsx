import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { User, Barangay } from '../../types';
import { ShieldAlert, Users, Building2, CheckCircle2, Search, Award } from 'lucide-react';

interface AdminDashboardProps {
  currentUser: User;
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onRefreshData }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getAllAdminUsers().then(setUsers).catch(console.error);
    api.getBarangays().then(setBarangays).catch(console.error);
  }, []);

  const filteredUsers = users.filter(
    u =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.barangayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Admin Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black">{currentUser.fullName}</h1>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase">
                System Administrator
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">National EcoBarangay Administration Console</p>
          </div>
        </div>
      </div>

      {/* Admin Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Total User Accounts</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{users.length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Active Barangays</div>
          <div className="text-3xl font-black text-emerald-600 mt-1">{barangays.length}</div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs font-bold text-slate-400 uppercase">Platinum Tier Barangays</div>
          <div className="text-3xl font-black text-amber-500 mt-1">
            {barangays.filter(b => b.score.tier === 'Platinum').length}
          </div>
        </div>
      </div>

      {/* User Directory */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Registered System Users</h3>
            <p className="text-xs text-slate-500">Manage resident and official user permissions.</p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-800 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Role</th>
                <th className="p-3">Barangay</th>
                <th className="p-3">Eco Points</th>
                <th className="p-3">Kg Recycled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/80">
                  <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                    <img
                      src={u.photoUrl || u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover"
                    />
                    <div>
                      <div>{u.fullName}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        u.role === 'RESIDENT'
                          ? 'bg-blue-100 text-blue-800'
                          : u.role === 'BARANGAY_OFFICIAL'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-700">
                    Brgy. {u.barangayName}, {u.city}
                  </td>
                  <td className="p-3 font-black text-amber-600">⚡ {u.ecoPoints}</td>
                  <td className="p-3 font-bold text-emerald-700">{u.kgRecycled} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
