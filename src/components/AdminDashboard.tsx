import React, { useState, useEffect } from 'react';
import { AdminStats, ReportRecord, DsaAppealRecord, AdminAuditLog, ModerationDecisionType } from '../types';
import { Shield, Users, Flag, Ban, CheckCircle, Scale, FileText, AlertTriangle, RefreshCw, Check, X } from 'lucide-react';

interface AdminDashboardProps {
  authToken: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ authToken }) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'appeals' | 'audit' | 'transparency'>('reports');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [appeals, setAppeals] = useState<DsaAppealRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [transparencyData, setTransparencyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Decision Form State for Reports
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reportDecision, setReportDecision] = useState<ModerationDecisionType>('WARNING');
  const [legalBasis, setLegalBasis] = useState('Terms of Service Section 4 (Community Conduct) & DSA Art. 16');
  const [statementOfReasons, setStatementOfReasons] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Decision Form State for Appeals
  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null);
  const [appealOutcome, setAppealOutcome] = useState<'UPHELD' | 'OVERTURNED'>('OVERTURNED');
  const [appealDecisionNotes, setAppealDecisionNotes] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [sRes, rRes, aRes, logRes, tRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/admin/dsa/appeals', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch('/api/dsa/transparency')
      ]);

      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.stats) setStats(sData.stats);
      }
      if (rRes.ok) {
        const rData = await rRes.json();
        if (rData.reports) setReports(rData.reports);
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        if (aData.appeals) setAppeals(aData.appeals);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        if (logData.auditLogs) setAuditLogs(logData.auditLogs);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTransparencyData(tData);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [authToken]);

  const handleDecideReport = async (reportId: string) => {
    if (!statementOfReasons.trim()) {
      alert('Statement of Reasons is legally required under DSA Article 17.');
      return;
    }

    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await fetch(`/api/admin/dsa/reports/${reportId}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          decision: reportDecision,
          legalBasis,
          statementOfReasons: statementOfReasons.trim()
        })
      });

      if (res.ok) {
        setActionMsg('Report decision and Statement of Reasons issued under DSA Art. 17.');
        setSelectedReportId(null);
        setStatementOfReasons('');
        fetchAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to process report decision');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing moderation action');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecideAppeal = async (appealId: string) => {
    if (!appealDecisionNotes.trim()) {
      alert('Written decision rationale is required under DSA Article 20.');
      return;
    }

    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await fetch(`/api/admin/dsa/appeals/${appealId}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          outcome: appealOutcome,
          decisionNotes: appealDecisionNotes.trim()
        })
      });

      if (res.ok) {
        setActionMsg(`Appeal officially ${appealOutcome.toLowerCase()} under DSA Art. 20.`);
        setSelectedAppealId(null);
        setAppealDecisionNotes('');
        fetchAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to process appeal');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing appeal decision');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-28 pt-2 px-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-black text-white tracking-wide">AURA Trust & Safety HQ</h2>
        </div>
        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Header Grid */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/10 bg-[#121422] p-2.5 text-center">
            <div className="text-base font-black text-white">{stats.totalUsers}</div>
            <div className="text-[9px] text-slate-400 font-bold uppercase">Accounts</div>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-center">
            <div className="text-base font-black text-amber-300">{reports.filter(r => r.status === 'PENDING').length}</div>
            <div className="text-[9px] text-amber-400 font-bold uppercase">Reports</div>
          </div>
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-2.5 text-center">
            <div className="text-base font-black text-purple-300">{appeals.filter(a => a.status === 'PENDING').length}</div>
            <div className="text-[9px] text-purple-400 font-bold uppercase">Appeals</div>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex p-1 rounded-2xl bg-white/[0.04] border border-white/10 text-xs">
        {[
          { id: 'reports', label: `Reports (${reports.length})` },
          { id: 'appeals', label: `Appeals (${appeals.length})` },
          { id: 'audit', label: 'Audit Log' },
          { id: 'transparency', label: 'Transparency' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-1.5 rounded-xl font-bold transition-all text-center ${
              activeTab === tab.id ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-semibold animate-fade-in flex items-center gap-1.5">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* TAB 1: DSA REPORTS QUEUE */}
      {activeTab === 'reports' && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
            Notice & Action Submissions (DSA Art. 16)
          </h3>

          {reports.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#121422] p-8 text-center space-y-1">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-slate-200">No active reports. Queue clear!</p>
            </div>
          ) : (
            reports.map(r => (
              <div key={r.id} className="p-3 rounded-2xl border border-amber-500/20 bg-[#121422] space-y-2.5">
                <div className="flex justify-between items-start text-xs">
                  <div>
                    <span className="font-bold text-white">Target User #{r.reportedUserId}</span>
                    <p className="text-[11px] text-amber-300 font-semibold">Category: {r.reason}</p>
                    {r.details && <p className="text-[10px] text-slate-300 italic">"{r.details}"</p>}
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    r.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-white/10 text-slate-400 border-white/20'
                  }`}>
                    {r.status}
                  </span>
                </div>

                {selectedReportId === r.id ? (
                  <div className="p-3 rounded-xl bg-black/60 border border-amber-500/40 space-y-2 text-xs">
                    <div className="font-bold text-amber-300">Issue DSA Statement of Reasons (Art. 17)</div>
                    <div>
                      <label className="text-[10px] text-slate-400">Sanction / Decision</label>
                      <select
                        value={reportDecision}
                        onChange={e => setReportDecision(e.target.value as any)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      >
                        <option value="WARNING">Issue Formal Warning</option>
                        <option value="SUSPENSION">Suspend Account</option>
                        <option value="CONTENT_REMOVAL">Remove Infringing Content</option>
                        <option value="DISMISSAL">Dismiss Notice (No Infringement)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Legal / Terms Basis</label>
                      <input
                        type="text"
                        value={legalBasis}
                        onChange={e => setLegalBasis(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Statement of Reasons (Delivered to User)</label>
                      <textarea
                        value={statementOfReasons}
                        onChange={e => setStatementOfReasons(e.target.value)}
                        placeholder="Provide clear, transparent justification under DSA Article 17..."
                        rows={2}
                        className="w-full bg-black/60 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setSelectedReportId(null)}
                        className="flex-1 py-1 rounded-lg bg-white/10 text-xs text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDecideReport(r.id)}
                        disabled={actionLoading}
                        className="flex-1 py-1 rounded-lg bg-amber-600 text-xs font-bold text-white hover:bg-amber-500"
                      >
                        {actionLoading ? 'Processing...' : 'Issue Sanction & Notice'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedReportId(r.id);
                      setStatementOfReasons(`Action taken on ${new Date().toLocaleDateString()} following verified DSA notice regarding ${r.reason}.`);
                    }}
                    className="w-full py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <Scale className="w-3.5 h-3.5" /> Adjudicate Report
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: DSA APPEALS QUEUE */}
      {activeTab === 'appeals' && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
            Internal Complaints & Appeals (DSA Art. 20)
          </h3>

          {appeals.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-[#121422] p-8 text-center space-y-1">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-slate-200">No pending appeals under Article 20.</p>
            </div>
          ) : (
            appeals.map(a => (
              <div key={a.id} className="p-3 rounded-2xl border border-purple-500/20 bg-[#121422] space-y-2.5">
                <div className="flex justify-between items-start text-xs">
                  <div>
                    <span className="font-bold text-white">Appellant User #{a.userId}</span>
                    <p className="text-[10px] text-slate-400">Notice #{a.noticeId.slice(0, 8)}</p>
                    <p className="text-[11px] text-purple-300 italic pt-1">"{a.appealReason}"</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    a.status === 'PENDING' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-white/10 text-slate-400 border-white/20'
                  }`}>
                    {a.status}
                  </span>
                </div>

                {selectedAppealId === a.id ? (
                  <div className="p-3 rounded-xl bg-black/60 border border-purple-500/40 space-y-2 text-xs">
                    <div className="font-bold text-purple-300">Human Moderator Appeal Resolution</div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAppealOutcome('OVERTURNED')}
                        className={`flex-1 py-1 rounded-lg font-bold border transition ${
                          appealOutcome === 'OVERTURNED' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-white/5 text-slate-400 border-white/10'
                        }`}
                      >
                        Overturn (Restore)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAppealOutcome('UPHELD')}
                        className={`flex-1 py-1 rounded-lg font-bold border transition ${
                          appealOutcome === 'UPHELD' ? 'bg-rose-600 text-white border-rose-400' : 'bg-white/5 text-slate-400 border-white/10'
                        }`}
                      >
                        Uphold (Affirm)
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Written Determination (Delivered to User)</label>
                      <textarea
                        value={appealDecisionNotes}
                        onChange={e => setAppealDecisionNotes(e.target.value)}
                        placeholder="State why the appeal is affirmed or overturned..."
                        rows={2}
                        className="w-full bg-black/60 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setSelectedAppealId(null)}
                        className="flex-1 py-1 rounded-lg bg-white/10 text-xs text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDecideAppeal(a.id)}
                        disabled={actionLoading}
                        className="flex-1 py-1 rounded-lg bg-purple-600 text-xs font-bold text-white hover:bg-purple-500"
                      >
                        {actionLoading ? 'Saving...' : 'Finalize Determination'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedAppealId(a.id);
                      setAppealDecisionNotes('Carefully reviewed by human moderator under DSA Art. 20.');
                    }}
                    className="w-full py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <Scale className="w-3.5 h-3.5" /> Adjudicate Appeal
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: IMMUTABLE AUDIT LOG */}
      {activeTab === 'audit' && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
            Immutable Audit Trail (GDPR Art. 5(2) & DSA Art. 28)
          </h3>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto custom-scrollbar">
            {auditLogs.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] text-xs text-slate-400 text-center">
                No audit entries recorded yet.
              </div>
            ) : (
              auditLogs.slice().reverse().map(log => (
                <div key={log.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span className="font-bold text-fuchsia-300">{log.action}</span>
                    <span className="text-[9px]">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-300">
                    Admin #{log.adminId} → Target: #{log.targetUserId || 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    {log.reason || (log.details ? JSON.stringify(log.details) : '')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DSA TRANSPARENCY REPORT */}
      {activeTab === 'transparency' && transparencyData && (
        <div className="p-4 rounded-2xl bg-[#121422] border border-amber-500/30 space-y-3 text-xs">
          <div className="font-black text-amber-300 text-sm">EU DSA Article 15 Transparency Declaration</div>
          <div className="space-y-1.5 text-slate-300">
            <div>Reporting Period: <strong>{transparencyData.reportingPeriod}</strong></div>
            <div>Average Resolution Speed: <strong>{transparencyData.averageResolutionTimeHours} hrs</strong></div>
            <div>Human Review Ratio: <strong className="text-emerald-400">{transparencyData.humanReviewRatio}</strong></div>
            <div>Autonomous AI Sanctions: <strong className="text-emerald-400">DISABLED (Strict Human-in-the-loop)</strong></div>
          </div>
          <div className="p-3 rounded-xl bg-black/50 border border-white/5 space-y-1 text-[11px]">
            <div className="font-bold text-white">EU Legal Representative & Contact:</div>
            <div>{transparencyData.singlePointOfContactDSA?.euRepresentative}</div>
            <div>Email: {transparencyData.singlePointOfContactDSA?.email}</div>
          </div>
        </div>
      )}
    </div>
  );
};
