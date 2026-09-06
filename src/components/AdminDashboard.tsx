import React, { useState, useEffect } from 'react';
import { AdminStats, ReportRecord } from '../types';
import { Shield, Users, Flag, Ban, CheckCircle } from 'lucide-react';

interface AdminDashboardProps {
  authToken: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ authToken }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [sRes, rRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${authToken}` } }),
        fetch('/api/admin/reports', { headers: { 'Authorization': `Bearer ${authToken}` } })
      ]);
      const sData = await sRes.json();
      const rData = await rRes.json();

      if (sData.stats) setStats(sData.stats);
      if (rData.reports) setReports(rData.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [authToken]);

  const handleSuspend = async (userId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      fetchAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 pt-2 px-3">
      <div className="flex items-center gap-2 px-1">
        <Shield className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-black text-white tracking-wide">Safety & Moderation Center</h2>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-[#121422] p-3 text-center">
            <div className="text-lg font-black text-white">{stats.totalUsers}</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Total Accounts</div>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
            <div className="text-lg font-black text-amber-300">{stats.pendingReports}</div>
            <div className="text-[10px] text-amber-400 font-bold uppercase">Pending Reports</div>
          </div>
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">User Reports Queue</h3>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#121422] p-8 text-center space-y-1">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-xs font-bold text-slate-200">No pending reports.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r.id} className="p-3 rounded-2xl border border-amber-500/20 bg-[#121422] space-y-2">
                <div className="flex justify-between items-start text-xs">
                  <div>
                    <span className="font-bold text-white">Report against User #{r.reportedUserId}</span>
                    <p className="text-[11px] text-amber-300">Reason: {r.reason}</p>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => handleSuspend(r.reportedUserId)}
                    className="flex-1 py-1 rounded-xl bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center gap-1"
                  >
                    <Ban className="w-3 h-3" /> Suspend User
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
