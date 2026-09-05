import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  DocumentTextIcon, UsersIcon, ClockIcon, ShieldExclamationIcon,
  BanknotesIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  ServerIcon, CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import DropdownGroup from '../components/DropDown';
import { StatCardSkeleton, ChartCardSkeleton } from '../components/LoadingSkeleton';
import {
  getAnalyticsOverview,
  getAnalyticsVolumeTrend,
  getAdminRosterHealth,
  getAccessRequestThroughput,
  getCashierVerificationHealth,
  getScheduledJobsHealth,
} from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────
//
// Same range vocabulary as AnalyticsDashboard.jsx (RANGE_MAP), duplicated
// rather than imported — the two dashboards are independent pages with no
// shared parent component today, and this is a 5-line const, not logic
// worth a cross-file dependency for.

const RANGE_MAP = {
  'Today':      'today',
  'This Week':  'week',
  'This Month': 'month',
  'This Year':  'year',
  'All Time':   'all',
};

/**
 * SuperAdmin Analytics Dashboard — Phase 2 of the Analytics & Audit Log
 * Revamp plan. System-level view, separate from the Registrar-facing
 * AnalyticsDashboard (queue volume/processing time/staff performance):
 * this page answers "is the system itself healthy" — roster state,
 * delegated-access throughput, and cross-system verification health.
 *
 * System-wide volume/trend reuses the existing /analytics endpoints
 * (getAnalyticsOverview/getAnalyticsVolumeTrend) rather than a duplicate
 * system-analytics endpoint — Super Admin already has access to those
 * (RoleMiddleware treats role:4 as a superset of every gated role).
 *
 * Security posture (failed logins, lockouts, IDP-unreachable events) is
 * intentionally NOT a panel here yet — it depends on the security_events
 * table proposed in Phase 3 of the plan, which hasn't been built. Add it
 * once that lands; do not approximate it from audit_log in the meantime.
 */
const SuperAdminAnalyticsDashboard = () => {
  const { isDark } = useTheme();

  // Filters — admin roster health is a point-in-time snapshot (see
  // SuperAdminAnalyticsService::adminRosterHealth docblock) and isn't
  // affected by the date range; the other three panels are.
  const [dateRange, setDateRange] = useState('This Month');

  const [overview, setOverview]     = useState(null);
  const [volumeData, setVolumeData] = useState([]);
  const [roster, setRoster]         = useState(null);
  const [accessThroughput, setAccessThroughput] = useState(null);
  const [cashierHealth, setCashierHealth]       = useState(null);
  const [jobsHealth, setJobsHealth]             = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const buildParams = useCallback(
    () => ({ range: RANGE_MAP[dateRange] ?? 'month' }),
    [dateRange]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = buildParams();

    Promise.all([
      getAnalyticsOverview(params),
      getAnalyticsVolumeTrend(params),
      getAdminRosterHealth(),
      getAccessRequestThroughput(params),
      getCashierVerificationHealth(params),
      getScheduledJobsHealth(),
    ])
      .then(([ovRes, volRes, rosterRes, accessRes, cashierRes, jobsRes]) => {
        if (cancelled) return;
        setOverview(ovRes.data);
        setVolumeData(volRes.data);
        setRoster(rosterRes.data);
        setAccessThroughput(accessRes.data);
        setCashierHealth(cashierRes.data);
        setJobsHealth(jobsRes.data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('System analytics fetch error:', err);
        setError('Could not load system analytics. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [buildParams]);

  const overviewTrend = () => {
    if (!overview) return { label: '—', status: 'neutral' };
    const pct = overview.volume_change_pct;
    if (pct == null) return { label: 'No prior data', status: 'neutral' };
    return {
      label:  `${pct > 0 ? '+' : ''}${pct}% vs prev period`,
      status: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
    };
  };
  const trend = overviewTrend();

  return (
    <div className={`space-y-6 py-10 md:py-5 lg:py-5 min-h-screen font-sans ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'text-gray-900'}`}>

      {/* ── Header + filter ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-3 w-full -mt-5">
        <div>
          <h1 className={`text-2xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#800000]'}`}>
            System Analytics
          </h1>
          <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}`}>
            Roster, Access, &amp; Verification Health
          </p>
        </div>

        <div className="w-full sm:w-44">
          <DropdownGroup
            name="dateRange"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={['Today', 'This Week', 'This Month', 'This Year', 'All Time']}
          />
        </div>
      </div>

      {error && (
        <div className={`px-4 py-3 rounded-2xl text-sm font-bold border ${isDark ? 'bg-rose-950/40 border-rose-900 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {error}
        </div>
      )}

      <div className="h-1.5 w-full bg-linear-to-r from-[#FFD700] via-[#FACC15] to-[#FFD700] rounded-full opacity-40 shadow-sm" />

      {/* ── System volume (reuses existing /analytics endpoints) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {loading || !overview
          ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} isDark={isDark} />)
          : <>
              <StatCard
                title="Total Requests"
                value={overview.total.toLocaleString()}
                trend={trend.label}
                status={trend.status}
                icon={<DocumentTextIcon className="w-6 h-6" />}
                lightColor="bg-amber-50" iconColor="text-amber-700"
                isDark={isDark}
              />
              <StatCard
                title="Claimed Docs"
                value={overview.completed.toLocaleString()}
                trend={overview?.completion_rate != null ? `${overview.completion_rate}% completion rate` : '—'}
                status={overview?.completion_rate >= 70 ? 'up' : 'down'}
                icon={<DocumentTextIcon className="w-6 h-6" />}
                lightColor="bg-blue-50" iconColor="text-blue-700"
                isDark={isDark}
              />
              <StatCard
                title="Avg Processing Time"
                value={overview.avg_processing_minutes != null ? `${overview.avg_processing_minutes}m` : '—'}
                trend="System-wide average"
                status="neutral"
                icon={<ClockIcon className="w-6 h-6" />}
                lightColor="bg-emerald-50" iconColor="text-emerald-700"
                isDark={isDark}
              />
            </>
        }
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading || volumeData.length === 0
          ? <ChartCardSkeleton isDark={isDark} />
          : (
            <div className={`border p-6 rounded-4xl shadow-sm min-w-0 ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-slate-200 bg-white'}`}>
              <ChartHeader title="System Volume" sub="Requests Over Time — All Registrars" isDark={isDark} />
              <div className="h-56">
                <ResponsiveContainer width="100%" height={224}>
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="colorSaMaroon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#800000" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#800000" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#3e4042' : '#f1f5f9'} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600, fill: isDark ? '#b0b3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? '#b0b3b8' : '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={(props) => <SimpleTooltip {...props} isDark={isDark} unit="Requests" />} />
                    <Area type="monotone" dataKey="total" stroke="#800000" strokeWidth={3} fillOpacity={1} fill="url(#colorSaMaroon)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        }
      </div>

      <div className="h-1.5 w-full bg-linear-to-r from-[#FFD700] via-[#FACC15] to-[#FFD700] rounded-full opacity-40 shadow-sm" />

      {/* ── Admin roster health ── */}
      <div>
        <ChartHeader title="Admin Roster Health" sub="Live Snapshot — Not Date-Filtered" isDark={isDark} />
        {loading || !roster
          ? <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{Array.from({ length: 3 }).map((_, i) => <ChartCardSkeleton key={i} isDark={isDark} />)}</div>
          : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Role breakdown */}
              <PanelCard isDark={isDark} title="Role Assignments" icon={<UsersIcon className="w-5 h-5" />}>
                {roster.role_breakdown.length === 0
                  ? <EmptyRow isDark={isDark} label="No admin or super admin role assignments yet." />
                  : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}`}>
                          <th className="text-left pb-2">Role</th>
                          <th className="text-right pb-2">Active</th>
                          <th className="text-right pb-2">Due to Expire</th>
                          <th className="text-right pb-2">Revoked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.role_breakdown.map((row) => (
                          <tr key={row.role_id} className={`border-t ${isDark ? 'border-[#3e4042]' : 'border-slate-100'}`}>
                            <td className="py-2 font-bold">{row.role_name}</td>
                            <td className="py-2 text-right">{row.active_count}</td>
                            <td className={`py-2 text-right ${row.due_to_expire_count > 0 ? 'text-amber-500 font-bold' : ''}`}>
                              {row.due_to_expire_count}
                            </td>
                            <td className="py-2 text-right">{row.revoked_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                }
              </PanelCard>

              {/* Pending activations */}
              <PanelCard isDark={isDark} title="Pending Activations" icon={<ClockIcon className="w-5 h-5" />}>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-3xl font-black">{roster.pending_activations.total}</span>
                  {roster.pending_activations.expiring_soon > 0 && (
                    <span className="text-xs font-bold text-amber-500">
                      {roster.pending_activations.expiring_soon} expiring within 3 days
                    </span>
                  )}
                </div>
                {roster.pending_activations.items.length === 0
                  ? <EmptyRow isDark={isDark} label="No pending activations." />
                  : (
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                      {roster.pending_activations.items.map((u) => (
                        <li key={u.user_id} className={`flex justify-between text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-slate-500'}`}>
                          <span className="truncate">{u.email}</span>
                          <span>{u.pending_expires_at ? new Date(u.pending_expires_at).toLocaleDateString() : '—'}</span>
                        </li>
                      ))}
                    </ul>
                  )
                }
              </PanelCard>

              {/* IDP sync failures */}
              <PanelCard isDark={isDark} title="IDP Sync Failures" icon={<ShieldExclamationIcon className="w-5 h-5" />} sub="Last 30 Days">
                <div className="text-3xl font-black mb-3">{roster.idp_sync_failures.count_last_30_days}</div>
                {roster.idp_sync_failures.recent.length === 0
                  ? <EmptyRow isDark={isDark} label="No IDP sync failures recently." />
                  : (
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                      {roster.idp_sync_failures.recent.map((f, i) => (
                        <li key={i} className={`text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-slate-500'}`}>
                          <span className="font-bold truncate block">{f.target_email ?? 'Unknown'}</span>
                          <span>{new Date(f.created_at).toLocaleString()}{f.reason ? ` — ${f.reason}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  )
                }
              </PanelCard>
            </div>
          )
        }
      </div>

      {/* ── Access request throughput + Cashier verification health ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading || !accessThroughput
          ? <ChartCardSkeleton isDark={isDark} />
          : (
            <PanelCard isDark={isDark} title="Access Request Throughput" icon={<UsersIcon className="w-5 h-5" />}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <MiniStat isDark={isDark} label="Total" value={accessThroughput.total} />
                <MiniStat isDark={isDark} label="Fulfilled" value={accessThroughput.fulfilled} />
                <MiniStat isDark={isDark} label="Rejected" value={accessThroughput.rejected} />
                <MiniStat isDark={isDark} label="Pending" value={accessThroughput.requested} />
              </div>
              <div className={`flex justify-between text-sm pt-3 border-t ${isDark ? 'border-[#3e4042]' : 'border-slate-100'}`}>
                <span className={isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}>Approval rate</span>
                <span className="font-bold">{accessThroughput.approval_rate != null ? `${accessThroughput.approval_rate}%` : '—'}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className={isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}>Avg time to review</span>
                <span className="font-bold">
                  {accessThroughput.avg_time_to_review_hours != null ? `${accessThroughput.avg_time_to_review_hours}h` : '—'}
                </span>
              </div>
            </PanelCard>
          )
        }

        {loading || !cashierHealth
          ? <ChartCardSkeleton isDark={isDark} />
          : (
            <PanelCard isDark={isDark} title="Cashier Verification Health" icon={<BanknotesIcon className="w-5 h-5" />}>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <MiniStat isDark={isDark} label="Attempts" value={cashierHealth.total_attempts} />
                <MiniStat isDark={isDark} label="Matched" value={cashierHealth.matched} />
                <MiniStat isDark={isDark} label="Unmatched" value={cashierHealth.unmatched} />
              </div>
              <div className={`flex justify-between text-sm pt-3 border-t ${isDark ? 'border-[#3e4042]' : 'border-slate-100'}`}>
                <span className={isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}>Match rate</span>
                <span className="font-bold">{cashierHealth.match_rate != null ? `${cashierHealth.match_rate}%` : '—'}</span>
              </div>

              <div className={`flex items-center justify-between text-sm mt-3 pt-3 border-t ${isDark ? 'border-[#3e4042]' : 'border-slate-100'}`}>
                <span className="flex items-center gap-1.5 font-bold">
                  <ExclamationTriangleIcon className={`w-4 h-4 ${cashierHealth.unresolved_backlog > 0 ? 'text-amber-500' : (isDark ? 'text-[#9a9a9a]' : 'text-slate-400')}`} />
                  Unresolved backlog
                </span>
                <span className="font-bold">{cashierHealth.unresolved_backlog}</span>
              </div>
              {cashierHealth.top_backlog_items.length > 0 && (
                <ul className="space-y-1.5 mt-2 max-h-28 overflow-y-auto">
                  {cashierHealth.top_backlog_items.map((item) => (
                    <li key={item.id} className={`flex justify-between text-xs ${isDark ? 'text-[#b0b3b8]' : 'text-slate-500'}`}>
                      <span className="truncate">{item.raw_label}</span>
                      <span>{item.occurrence_count}×</span>
                    </li>
                  ))}
                </ul>
              )}
            </PanelCard>
          )
        }
      </div>

      {/* ── Scheduled jobs health ── */}
      <div>
        <ChartHeader title="Scheduled Jobs Health" sub="Last Run Per Job — Not Date-Filtered" isDark={isDark} />
        {loading || !jobsHealth
          ? <ChartCardSkeleton isDark={isDark} />
          : (
            <div className={`border p-6 rounded-4xl shadow-sm min-w-0 ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-slate-200 bg-white'}`}>
              {jobsHealth.needs_attention > 0 && (
                <div className={`flex items-center gap-2 mb-4 px-3.5 py-2.5 rounded-2xl text-xs font-bold border ${isDark ? 'bg-rose-950/40 border-rose-900 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                  {jobsHealth.needs_attention} job(s) need attention — failed, stalled, overdue, or never recorded a run.
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}`}>
                    <th className="text-left pb-2">Job</th>
                    <th className="text-left pb-2">Schedule</th>
                    <th className="text-left pb-2">Status</th>
                    <th className="text-right pb-2">Last Run</th>
                    <th className="text-right pb-2">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsHealth.jobs.map((job) => (
                    <tr key={job.job_name} className={`border-t align-top ${isDark ? 'border-[#3e4042]' : 'border-slate-100'}`}>
                      <td className="py-2.5 font-bold">
                        <div>{job.job_name}</div>
                        {job.error_message && (
                          <div className={`text-[11px] font-normal mt-0.5 truncate max-w-xs ${isDark ? 'text-rose-400' : 'text-rose-600'}`} title={job.error_message}>
                            {job.error_message}
                          </div>
                        )}
                      </td>
                      <td className={`py-2.5 ${isDark ? 'text-[#b0b3b8]' : 'text-slate-500'}`}>{job.schedule}</td>
                      <td className="py-2.5"><JobStatusBadge status={job.status} /></td>
                      <td className={`py-2.5 text-right ${isDark ? 'text-[#b0b3b8]' : 'text-slate-500'}`}>
                        {job.last_started_at ? new Date(job.last_started_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 text-right font-bold">{job.rows_affected ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
};

// ─── Small shared building blocks ──────────────────────────────────────────
// Deliberately not imported from AnalyticsDashboard.jsx — those are
// module-private consts in that file, not exported. Re-declared here at a
// smaller scope (no sort carets, no pie-chart specifics) since this page's
// needs are simpler; promote to a shared component file if a third
// analytics page needs the same pieces.

const StatCard = ({ title, value, trend, status, icon, lightColor, iconColor, isDark }) => {
  const chip = {
    up:      'bg-emerald-100 text-emerald-700',
    down:    'bg-rose-100 text-rose-700',
    neutral: 'bg-amber-100 text-amber-700',
  }[status] ?? 'bg-slate-100 text-slate-500';

  return (
    <div className={`relative p-6 rounded-4xl border shadow-sm ${isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-slate-200'}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}`}>{title}</p>
          <h3 className={`text-4xl font-black tracking-tighter ${isDark ? 'text-[#e4e6eb]' : 'text-slate-800'}`}>{value}</h3>
        </div>
        <div className={`p-3 ${lightColor} ${iconColor} rounded-2xl shadow-sm`}>{icon}</div>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${chip}`}>
          {status === 'up'   && <ArrowTrendingUpIcon   className="w-3 h-3" />}
          {status === 'down' && <ArrowTrendingDownIcon className="w-3 h-3" />}
          {trend}
        </div>
      </div>
    </div>
  );
};

const ChartHeader = ({ title, sub, isDark }) => (
  <div className="mb-4">
    <h2 className={`text-xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#800000]'}`}>{title}</h2>
    <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}`}>{sub}</p>
  </div>
);

const PanelCard = ({ title, sub, icon, isDark, children }) => (
  <div className={`border p-6 rounded-4xl shadow-sm min-w-0 ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-slate-200 bg-white'}`}>
    <div className="flex items-center gap-2 mb-4">
      <span className={isDark ? 'text-[#e4e6eb]' : 'text-[#800000]'}>{icon}</span>
      <div>
        <h3 className={`text-sm font-black uppercase tracking-tight ${isDark ? 'text-[#e4e6eb]' : 'text-slate-800'}`}>{title}</h3>
        {sub && <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}`}>{sub}</p>}
      </div>
    </div>
    {children}
  </div>
);

const MiniStat = ({ label, value, isDark }) => (
  <div>
    <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#9a9a9a]' : 'text-slate-400'}`}>{label}</p>
    <p className={`text-xl font-black ${isDark ? 'text-[#e4e6eb]' : 'text-slate-800'}`}>{value?.toLocaleString?.() ?? value}</p>
  </div>
);

// Status pill for the Scheduled Jobs Health table — mirrors the JobRunLog
// status values the backend actually sends ('success' | 'failed' | 'running'
// | 'stalled' | 'overdue' | 'never_run', see SuperAdminAnalyticsService::
// scheduledJobsHealth()), plus a safe fallback for anything unrecognized
// rather than rendering a blank pill.
//
// 'overdue' gets its own (orange, distinct from amber 'stalled') style
// rather than reusing 'stalled' — they're different failure modes a
// SuperAdmin needs to tell apart at a glance: 'stalled' means a run is
// stuck mid-execution right now, 'overdue' means the last run finished
// cleanly but the job never started again on schedule (e.g. the
// scheduler container was down across an entire tick).
const JOB_STATUS_STYLES = {
  success:   { label: 'Success',    icon: CheckCircleIcon,        className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed:    { label: 'Failed',     icon: XCircleIcon,            className: 'bg-rose-50 text-rose-700 border-rose-200' },
  running:   { label: 'Running',    icon: ClockIcon,               className: 'bg-blue-50 text-blue-700 border-blue-200' },
  stalled:   { label: 'Stalled',    icon: ExclamationTriangleIcon, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue:   { label: 'Overdue',    icon: ExclamationTriangleIcon, className: 'bg-orange-50 text-orange-700 border-orange-200' },
  never_run: { label: 'Never Run',  icon: ExclamationTriangleIcon, className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const JobStatusBadge = ({ status }) => {
  const style = JOB_STATUS_STYLES[status] ?? { label: status, icon: ServerIcon, className: 'bg-slate-100 text-slate-500 border-slate-200' };
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${style.className}`}>
      <Icon className="w-3.5 h-3.5" />
      {style.label}
    </span>
  );
};

const EmptyRow = ({ label, isDark }) => (
  <p className={`text-xs italic ${isDark ? 'text-[#7a7a7a]' : 'text-slate-400'}`}>{label}</p>
);

const SimpleTooltip = ({ active, payload, isDark, unit }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      className={`px-3.5 py-2.5 rounded-2xl text-xs border pointer-events-none ${isDark ? 'bg-[#242526] border-[#3e4042] text-[#e4e6eb]' : 'bg-white border-slate-200/90 text-slate-800'}`}
      style={{ boxShadow: isDark ? '0 10px 25px -5px rgba(0,0,0,0.6)' : '0 10px 25px -5px rgba(0,0,0,0.12)' }}
    >
      <span className="font-extrabold">{item.value} {unit}</span>
    </div>
  );
};

export default SuperAdminAnalyticsDashboard;