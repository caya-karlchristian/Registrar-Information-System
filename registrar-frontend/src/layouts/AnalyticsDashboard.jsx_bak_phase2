import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  DocumentTextIcon, BellAlertIcon, CheckCircleIcon, ClockIcon, 
  ArrowTrendingUpIcon, ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import DropdownGroup from '../components/DropDown';
import {
  getDocumentTypes,
  getAnalyticsOverview,
  getAnalyticsVolumeTrend,
  getAnalyticsByDocType,
  getAnalyticsByStatus,
} from '../services/api';

const RANGE_MAP = {
  'Today':      'today',
  'This Week':  'week',
  'This Month': 'month',
};

const DOC_COLORS = ['#800000', '#A52A2A', '#D2691E', '#E9967A', '#C04000', '#B03000'];

const PIE_COLORS = ['#800000', '#FFC72C', '#A52A2A', '#E9967A', '#D2691E'];

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('This Month');
  const [docType, setDocType] = useState('All Documents');
  const [documentTypes, setDocumentTypes] = useState([]);

  const [overview, setOverview]       = useState(null);
  const [volumeData, setVolumeData]   = useState([]);
  const [docTypeData, setDocTypeData] = useState([]);
  const [statusData, setStatusData]   = useState([]);

  // Load document type dropdown once
  useEffect(() => {
    const loadDocumentTypes = async () => {
      try {
        const res = await getDocumentTypes();
        const names = res.data.map(doc => doc.document_name);
        setDocumentTypes(['All Documents', ...names]);
      } catch (err) {
        console.error('Failed to load document types:', err);
        setDocumentTypes(['All Documents']);
      }
    };
    loadDocumentTypes();
  }, []);

  // Reload all charts when date filter changes
  useEffect(() => {
    const params = { range: RANGE_MAP[dateRange] ?? 'month' };

    Promise.all([
      getAnalyticsOverview(params),
      getAnalyticsVolumeTrend(params),
      getAnalyticsByDocType(params),
      getAnalyticsByStatus(params),
    ])
      .then(([ovRes, volRes, docRes, statRes]) => {
        setOverview(ovRes.data);
        setVolumeData(volRes.data);
        setDocTypeData(docRes.data);
        setStatusData(statRes.data);
      })
      .catch(err => console.error('Analytics fetch error:', err));
  }, [dateRange]);

  // Pie chart helpers
  const pieTotal     = statusData.reduce((s, r) => s + r.total, 0);
  const completedRow = statusData.find(r => r.status_name?.toLowerCase().includes('complet'));
  const successPct   = pieTotal > 0 && completedRow
    ? Math.round((completedRow.total / pieTotal) * 100)
    : 0;

  return (
    <div className="space-y-6 px-4 py-2 min-h-screen font-sans">
      
      {/* 1. DATE SELECTOR & STATIC REPORT BUTTON */}
      <div className="space-y-3 rounded-3xl -mt-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-end gap-3 w-full">
          {/* Document Type */}
          <div className="w-full lg:w-72">
            <DropdownGroup
              name="docType"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              options={documentTypes}
            />
          </div>

          {/* Right group */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 w-full lg:w-auto lg:ml-auto">

            {/* Date Range */}
            <div className="w-full sm:w-44">
              <DropdownGroup
                name="dateRange"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                options={["Today", "This Week", "This Month", "Custom Range"]}
              />
            </div>

            {/* Custom date inputs */}
            {dateRange === 'Custom Range' && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm w-full sm:w-auto">
                <input type="date" className="text-xs font-bold text-slate-600 bg-slate-50 p-1.5 rounded-lg outline-none border border-slate-100 focus:border-[#800000] transition-all" />
                <div className="w-2 h-px bg-slate-300 shrink-0" />
                <input type="date" className="text-xs font-bold text-slate-600 bg-slate-50 p-1.5 rounded-lg outline-none border border-slate-100 focus:border-[#800000] transition-all" />
              </div>
            )}

            {/* Button */}
            <button
              type="button"
              className="flex items-center justify-center gap-2 bg-[#800000] text-white px-5 py-3 rounded-lg font-bold shadow-lg whitespace-nowrap text-sm w-full sm:w-auto"
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STAT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Requests"
          value={overview ? overview.total.toLocaleString() : '—'}
          trend={overview?.volume_change_pct != null ? `${overview.volume_change_pct > 0 ? '+' : ''}${overview.volume_change_pct}%` : '—'}
          status={overview?.volume_change_pct > 0 ? 'up' : overview?.volume_change_pct < 0 ? 'down' : 'neutral'}
          icon={<DocumentTextIcon className="w-6 h-6" />}
          lightColor="bg-red-50" iconColor="text-maroon-700"
        />
        <StatCard
          title="Pending Review"
          value={overview ? overview.pending.toLocaleString() : '—'}
          trend="High Volume"
          status="neutral"
          icon={<BellAlertIcon className="w-6 h-6" />}
          lightColor="bg-amber-50" iconColor="text-amber-700"
        />
        <StatCard
          title="Claimed Docs"
          value={overview ? overview.completed.toLocaleString() : '—'}
          trend={overview?.completion_rate != null ? `${overview.completion_rate}% rate` : '—'}
          status="down"
          icon={<CheckCircleIcon className="w-6 h-6" />}
          lightColor="bg-blue-50" iconColor="text-blue-700"
        />
        <StatCard
          title="Forfeited Requests"
          value={overview ? overview.forfeited.toLocaleString() : '—'}
          trend={overview?.forfeit_rate != null ? `+${overview.forfeit_rate}%` : '—'}
          status="up"
          icon={<ClockIcon className="w-6 h-6" />}
          lightColor="bg-emerald-50" iconColor="text-emerald-700"
        />
      </div>

      <div className="h-1.5 w-full bg-linear-to-r from-[#FFD700] via-[#FACC15] to-[#FFD700] rounded-full opacity-40 shadow-sm" />

      {/* 3. CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Chart 1: Request Volume */}
        <div className="border border-slate-200 p-6 rounded-4xl bg-white shadow-sm">
          <h2 className="text-xl font-black text-[#800000] uppercase mb-1 tracking-tight">Request Volume</h2>
          <p className="text-slate-500 mb-6 text-xs font-bold uppercase tracking-widest text-[10px]">Monthly Growth</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData}>
                <defs>
                  <linearGradient id="colorMaroon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#800000" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#800000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                <Area type="monotone" dataKey="total" stroke="#800000" strokeWidth={3} fillOpacity={1} fill="url(#colorMaroon)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Documents */}
        <div className="border border-slate-200 p-6 rounded-4xl bg-white shadow-sm">
          <h2 className="text-xl font-black text-[#800000] uppercase mb-1 tracking-tight">Top Documents</h2>
          <p className="text-slate-500 mb-6 text-xs font-bold uppercase tracking-widest text-[10px]">Most Requested</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={docTypeData.slice(0, 6)} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="document_name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} />
                <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="total_requests" radius={[10, 10, 0, 0]}>
                  {docTypeData.slice(0, 6).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={DOC_COLORS[index % DOC_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>   
             
        {/* Chart 3: PIE CHART */}
        <div className="border border-slate-200 p-6 rounded-[2.5rem] bg-white shadow-sm flex flex-col">
          <h2 className="text-lg font-black text-[#800000] uppercase mb-1 tracking-tight">Request Status</h2>
          <p className="text-slate-400 mb-6 text-[10px] font-bold uppercase tracking-widest">Accepted vs Rejected</p>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="total"
                  nameKey="status_name"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  stroke="none"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} cornerRadius={10} />
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
          <div className="mt-4 flex justify-center gap-6">
            {statusData.map((row, index) => (
              <div key={row.status_id} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{row.status_name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, trend, status, icon, lightColor, iconColor }) => {
  const statusStyles = {
    up: "bg-emerald-100 text-emerald-700",
    down: "bg-rose-100 text-rose-700",
    neutral: "bg-amber-100 text-amber-700"
  };

  return (
    <div className="relative bg-white p-6 rounded-4xl border border-slate-200 shadow-sm">
      <div className="relative flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.12em]">{title}</p>
          <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{value}</h3>
        </div>
        <div className={`p-3 ${lightColor} ${iconColor} rounded-2xl shadow-sm`}>{icon}</div>
      </div>
      <div className="mt-6 flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${statusStyles[status]}`}>
          {status === 'up' && <ArrowTrendingUpIcon className="w-3 h-3" />}
          {status === 'down' && <ArrowTrendingDownIcon className="w-3 h-3" />}
          {trend}
        </div>
        <span className="text-[11px] text-slate-400 font-bold">vs last month</span>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;