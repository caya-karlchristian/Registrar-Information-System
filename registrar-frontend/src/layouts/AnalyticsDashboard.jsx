import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts';
import {
  DocumentTextIcon, BellAlertIcon, CheckCircleIcon, ClockIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import DropdownGroup from '../components/DropDown';
import AIInsightCard from '../components/AIInsightCard';
import {
  getDocumentTypes,
  getAnalyticsOverview,
  getAnalyticsVolumeTrend,
  getAnalyticsByDocType,
  getAnalyticsByStatus,
  getAnalyticsProcessingTime,
  getAnalyticsPeakHours,
  getAnalyticsByPurpose,
  postAnalyticsAiReport,
} from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────

const RANGE_MAP = {
  'Today':      'today',
  'This Week':  'week',
  'This Month': 'month',
  'This Year':  'year',
  'All Time':   'all',
};

const DOC_COLORS  = ['#800000','#A52A2A','#D2691E','#E9967A','#C04000','#B03000'];
const PIE_COLORS  = ['#800000','#FFC72C','#A52A2A','#E9967A','#D2691E'];
const HOUR_COLOR  = '#800000';

// ─── Component ────────────────────────────────────────────────────────────

const AnalyticsDashboard = () => {
  // Filters
  const [dateRange, setDateRange]     = useState('This Month');
  const [customFrom, setCustomFrom]   = useState('');
  const [customTo, setCustomTo]       = useState('');
  const [docType, setDocType]         = useState('All Documents');
  const [documentTypes, setDocumentTypes] = useState([]);

  // Chart data
  const [overview, setOverview]             = useState(null);
  const [volumeData, setVolumeData]         = useState([]);
  const [docTypeData, setDocTypeData]       = useState([]);
  const [statusData, setStatusData]         = useState([]);
  const [processingData, setProcessingData] = useState({ by_document_type: [], by_admin: [] });
  const [peakHoursData, setPeakHoursData]   = useState([]);
  const [purposeData, setPurposeData]       = useState([]);

  // AI report state
  const [aiNarrative, setAiNarrative]   = useState(null);
  const [aiLoading, setAiLoading]       = useState(false);
  const [aiError, setAiError]           = useState(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState(null);

  // ── Build params object from current filters ──────────────────────────

  const buildParams = useCallback(() => {
    if (dateRange === 'Custom Range' && customFrom && customTo) {
      return { range: 'custom', from: customFrom, to: customTo };
    }
    return { range: RANGE_MAP[dateRange] ?? 'month' };
  }, [dateRange, customFrom, customTo]);

  // ── Load document type dropdown once ──────────────────────────────────

  useEffect(() => {
    getDocumentTypes()
      .then(res => setDocumentTypes(['All Documents', ...res.data.map(d => d.document_name)]))
      .catch(() => setDocumentTypes(['All Documents']));
  }, []);

  // ── Reload all charts when date filter changes ────────────────────────

  useEffect(() => {
    const shouldFetch =
      dateRange !== 'Custom Range' ||
      (customFrom && customTo && customFrom <= customTo);

    if (!shouldFetch) return;

    const params = buildParams();

    // Build doc-type params — pass name filter only when not 'All Documents'
    const docParams = docType !== 'All Documents'
      ? { ...params, document_name: docType }
      : params;

    Promise.all([
      getAnalyticsOverview(params),
      getAnalyticsVolumeTrend(params),
      getAnalyticsByDocType(docParams),
      getAnalyticsByStatus(params),
      getAnalyticsProcessingTime(params),
      getAnalyticsPeakHours(params),
      getAnalyticsByPurpose(params),
    ]).then(([ovRes, volRes, docRes, statRes, procRes, peakRes, purpRes]) => {
      setOverview(ovRes.data);
      setVolumeData(volRes.data);
      setDocTypeData(docRes.data);
      setStatusData(statRes.data);
      setProcessingData(procRes.data);
      setPeakHoursData(peakRes.data);
      setPurposeData(purpRes.data);
    }).catch(err => console.error('Analytics fetch error:', err));
  }, [dateRange, customFrom, customTo, docType, buildParams]);

  // ── AI report handler ─────────────────────────────────────────────────

  const handleGenerateReport = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await postAnalyticsAiReport(buildParams());
      setAiNarrative(res.data.narrative);
      setAiGeneratedAt(res.data.generated_at);
    } catch (err) {
      setAiError(
        err.response?.data?.error ?? 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  // ── Derived pie stats ─────────────────────────────────────────────────

  const pieTotal     = statusData.reduce((s, r) => s + r.total, 0);
  const completedRow = statusData.find(r => r.status_name?.toLowerCase().includes('complet'));
  const successPct   = pieTotal > 0 && completedRow
    ? Math.round((completedRow.total / pieTotal) * 100)
    : 0;

  // ── Trend helper for StatCard ─────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-4 py-2 min-h-screen font-sans">

      {/* ── 1. FILTER BAR ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end gap-3 w-full -mt-5">

        {/* Document Type */}
        <div className="w-full lg:w-72">
          <DropdownGroup
            name="docType"
            value={docType}
            onChange={e => setDocType(e.target.value)}
            options={documentTypes}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 w-full lg:w-auto lg:ml-auto">

          {/* Date Range */}
          <div className="w-full sm:w-44">
            <DropdownGroup
              name="dateRange"
              value={dateRange}
              onChange={e => setDateRange(e.target.value)}
              options={['Today','This Week','This Month','This Year','All Time','Custom Range']}
            />
          </div>

          {/* Custom date inputs — only when Custom Range selected */}
          {dateRange === 'Custom Range' && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm w-full sm:w-auto">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="text-xs font-bold text-slate-600 bg-slate-50 p-1.5 rounded-lg outline-none border border-slate-100 focus:border-[#800000] transition-all"
              />
              <div className="w-2 h-px bg-slate-300 shrink-0" />
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                min={customFrom}
                className="text-xs font-bold text-slate-600 bg-slate-50 p-1.5 rounded-lg outline-none border border-slate-100 focus:border-[#800000] transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── 2. KPI CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Requests"
          value={overview ? overview.total.toLocaleString() : '—'}
          trend={trend.label}
          status={trend.status}
          icon={<DocumentTextIcon className="w-6 h-6" />}
          lightColor="bg-red-50" iconColor="text-[#800000]"
        />
        <StatCard
          title="Pending Review"
          value={overview ? overview.pending.toLocaleString() : '—'}
          trend="Awaiting processing"
          status="neutral"
          icon={<BellAlertIcon className="w-6 h-6" />}
          lightColor="bg-amber-50" iconColor="text-amber-700"
        />
        <StatCard
          title="Claimed Docs"
          value={overview ? overview.completed.toLocaleString() : '—'}
          trend={overview?.completion_rate != null ? `${overview.completion_rate}% completion rate` : '—'}
          status={overview?.completion_rate >= 70 ? 'up' : 'down'}
          icon={<CheckCircleIcon className="w-6 h-6" />}
          lightColor="bg-blue-50" iconColor="text-blue-700"
        />
        <StatCard
          title="Forfeited"
          value={overview ? overview.forfeited.toLocaleString() : '—'}
          trend={overview?.forfeit_rate != null ? `${overview.forfeit_rate}% forfeit rate` : '—'}
          status={overview?.forfeit_rate > 10 ? 'up' : 'neutral'}
          icon={<ClockIcon className="w-6 h-6" />}
          lightColor="bg-emerald-50" iconColor="text-emerald-700"
        />
      </div>

      <div className="h-1.5 w-full bg-gradient-to-r from-[#FFD700] via-[#FACC15] to-[#FFD700] rounded-full opacity-40 shadow-sm" />

      {/* ── 3. MAIN CHARTS ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Request Volume */}
        <div className="border border-slate-200 p-6 rounded-4xl bg-white shadow-sm">
          <ChartHeader title="Request Volume" sub="Monthly Growth" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorMaroon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#800000" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#800000" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                <Area type="monotone" dataKey="total" stroke="#800000" strokeWidth={3} fillOpacity={1} fill="url(#colorMaroon)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Documents */}
        <div className="border border-slate-200 p-6 rounded-4xl bg-white shadow-sm">
          <ChartHeader title="Top Documents" sub="Most Requested" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={docTypeData.slice(0, 6)} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="document_name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="total_requests" radius={[10, 10, 0, 0]}>
                  {docTypeData.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={DOC_COLORS[i % DOC_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Request Status Donut */}
        <div className="border border-slate-200 p-6 rounded-4xl bg-white shadow-sm flex flex-col">
          <ChartHeader title="Request Status" sub="Distribution Breakdown" />
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="total" nameKey="status_name"
                  innerRadius={70} outerRadius={90} paddingAngle={8} stroke="none">
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} cornerRadius={10} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-800">{successPct}%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Success</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {statusData.map((row, i) => (
              <div key={row.status_id} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{row.status_name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. SECOND CHARTS ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Peak Hours Heatmap */}
        <div className="border border-slate-200 p-6 rounded-4xl bg-white shadow-sm">
          <ChartHeader title="Peak Hours" sub="Requests by Hour of Day" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false}
                  interval={3} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val, name) => [val, 'Requests']}
                  contentStyle={{ borderRadius: '12px', border: 'none' }}
                />
                <Bar dataKey="total" fill={HOUR_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Requests by Purpose */}
        <div className="border border-slate-200 p-6 rounded-4xl bg-white shadow-sm">
          <ChartHeader title="By Purpose" sub="Request Reason Breakdown" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purposeData} layout="vertical" barSize={18}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="purpose_name" tick={{ fontSize: 11, fontWeight: 600 }}
                  axisLine={false} tickLine={false} width={110} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {purposeData.map((_, i) => (
                    <Cell key={i} fill={DOC_COLORS[i % DOC_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Processing Time by Doc Type */}
        <div className="border border-slate-200 p-6 rounded-4xl bg-white shadow-sm">
          <ChartHeader title="Processing Time" sub="Avg Minutes by Document Type" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processingData.by_document_type ?? []} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="document_name" tick={{ fontSize: 10, fontWeight: 600 }}
                  axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                  label={{ value: 'min', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip
                  formatter={(val) => [`${val} min`, 'Avg Time']}
                  contentStyle={{ borderRadius: '12px', border: 'none' }}
                />
                <Bar dataKey="avg_minutes" radius={[8, 8, 0, 0]}>
                  {(processingData.by_document_type ?? []).map((_, i) => (
                    <Cell key={i} fill={DOC_COLORS[i % DOC_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── 5. ADMIN PROCESSING LEADERBOARD ── */}
      {(processingData.by_admin ?? []).length > 0 && (
        <div className="border border-slate-200 p-6 rounded-4xl bg-white shadow-sm">
          <ChartHeader title="Staff Performance" sub="Average Processing Time per Admin" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  <th className="pb-3 pr-6">Staff Member</th>
                  <th className="pb-3 pr-6 text-right">Requests Handled</th>
                  <th className="pb-3 text-right">Avg Processing Time</th>
                </tr>
              </thead>
              <tbody>
                {(processingData.by_admin ?? []).map((row, i) => (
                  <tr key={row.user_id ?? i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-3 pr-6 font-bold text-slate-700">
                      {row.display_name?.trim() || row.email || 'Unknown'}
                    </td>
                    <td className="py-3 pr-6 text-right font-bold text-slate-500">
                      {row.requests_handled}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                        row.avg_minutes <= 30
                          ? 'bg-emerald-100 text-emerald-700'
                          : row.avg_minutes <= 60
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {row.avg_minutes} min
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. AI INSIGHT CARD ── */}
      <AIInsightCard
        narrative={aiNarrative}
        loading={aiLoading}
        error={aiError}
        onGenerate={handleGenerateReport}
        generatedAt={aiGeneratedAt}
      />

    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────

const ChartHeader = ({ title, sub }) => (
  <div className="mb-4">
    <h2 className="text-xl font-black text-[#800000] uppercase tracking-tight">{title}</h2>
    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub}</p>
  </div>
);

const StatCard = ({ title, value, trend, status, icon, lightColor, iconColor }) => {
  const chip = {
    up:      'bg-emerald-100 text-emerald-700',
    down:    'bg-rose-100 text-rose-700',
    neutral: 'bg-amber-100 text-amber-700',
  }[status] ?? 'bg-slate-100 text-slate-500';

  return (
    <div className="relative bg-white p-6 rounded-4xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.12em]">{title}</p>
          <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{value}</h3>
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

export default AnalyticsDashboard;
