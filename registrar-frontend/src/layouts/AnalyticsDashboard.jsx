import React, { useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  DocumentTextIcon, BellAlertIcon, CheckCircleIcon, ClockIcon, 
  CalendarDaysIcon, ChevronDownIcon, ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon 
} from '@heroicons/react/24/outline';

/* =========================================
   MAIN COMPONENT: ANALYTICS DASHBOARD
   ========================================= */
const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState('This Month');

  // Mock Data
  const volumeData = [
    { name: 'Jan', value: 50 }, { name: 'Feb', value: 60 }, { name: 'Mar', value: 75 },
    { name: 'Apr', value: 80 }, { name: 'May', value: 100 }, { name: 'Jun', value: 120 },
    { name: 'Jul', value: 150 }, { name: 'Aug', value: 130 },
  ];

  const documentData = [
    { name: 'TOR', count: 25, color: '#800000' },
    { name: 'COG', count: 15, color: '#A52A2A' },
    { name: 'Diploma', count: 20, color: '#D2691E' },
    { name: 'Good Moral', count: 20, color: '#E9967A' },
  ];

  return (
    <div className="space-y-6 px-4 py-2 min-h-screen font-sans">
      
      {/* 1. DATE SELECTOR & STATIC REPORT BUTTON */}
      <div className="space-y-3 rounded-3xl -mt-5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
          <div className="md:ml-auto flex items-center gap-3 w-full md:w-auto">
            
            {/* Date Picker Capsule */}
            <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex-1 md:flex-none">
              <CalendarDaysIcon className="w-5 h-5 text-maroon-600 ml-2" />
              <div className="relative group flex-1 md:flex-none">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-transparent text-sm font-bold text-slate-600 outline-none appearance-none cursor-pointer hover:text-maroon-700 transition-colors"
                >
                  <option value="Today">Today</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Custom Range">Custom Date</option>
                </select>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none group-hover:text-maroon-500 transition-colors" />
              </div>

              {dateRange === 'Custom Range' && (
                <div className="flex items-center gap-2 px-3 border-l border-slate-100 ml-2 animate-in fade-in zoom-in-95 duration-300">
                  <input type="date" className="text-xs font-bold text-slate-600 bg-slate-50 p-1.5 rounded-lg outline-none border border-slate-100 focus:border-maroon-300 transition-all" />
                  <div className="w-2 h-px bg-slate-300"></div>
                  <input type="date" className="text-xs font-bold text-slate-600 bg-slate-50 p-1.5 rounded-lg outline-none border border-slate-100 focus:border-maroon-300 transition-all" />
                </div>
              )}
            </div>

            <button
              type="button"
              className="flex items-center gap-2 bg-[#800000] text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-maroon-700/20 whitespace-nowrap text-sm cursor-default"
            >
              <DocumentTextIcon className="w-4 h-4" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. STAT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Requests" value="1,245" trend="+12.5%" status="up" icon={<DocumentTextIcon className="w-6 h-6" />} lightColor="bg-red-50" iconColor="text-maroon-700" />
        <StatCard title="Pending Review" value="1,902" trend="High Volume" status="neutral" icon={<BellAlertIcon className="w-6 h-6" />} lightColor="bg-amber-50" iconColor="text-amber-700" />
        <StatCard title="Claimed Docs" value="90" trend="-5.2%" status="down" icon={<CheckCircleIcon className="w-6 h-6" />} lightColor="bg-blue-50" iconColor="text-blue-700" />
        <StatCard title="Avg. Processing" value="3.2d" trend="-0.5 days" status="up" icon={<ClockIcon className="w-6 h-6" />} lightColor="bg-emerald-50" iconColor="text-emerald-700" />
      </div>

      <div className="h-1.5 w-full bg-gradient-to-r from-[#FFD700] via-[#FACC15] to-[#FFD700] rounded-full opacity-40 shadow-sm" />
      {/* 3. CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Chart 1: Request Volume */}
        <div className="border border-slate-200 p-6 rounded-[2rem] bg-white shadow-sm">
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
                <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 600}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none'}} />
                <Area type="monotone" dataKey="value" stroke="#800000" strokeWidth={3} fillOpacity={1} fill="url(#colorMaroon)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top Documents */}
        <div className="border border-slate-200 p-6 rounded-[2rem] bg-white shadow-sm">
          <h2 className="text-xl font-black text-[#800000] uppercase mb-1 tracking-tight">Top Documents</h2>
          {/* Added a margin p tag here to align heights with the first chart */}
          <p className="text-slate-500 mb-6 text-xs font-bold uppercase tracking-widest text-[10px]">Most Requested</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={documentData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} /> 
                <YAxis tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                  {documentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>   
             
        {/* Chart 3: PIE CHART FOR REJECTED AND ACCEPTED REQUEST */}
        <div className="border border-slate-200 p-6 rounded-[2.5rem] bg-white shadow-sm flex flex-col">
          <h2 className="text-lg font-black text-[#800000] uppercase mb-1 tracking-tight">Request Status</h2>
          <p className="text-slate-400 mb-6 text-[10px] font-bold uppercase tracking-widest">Accepted vs Rejected</p>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{name: 'Accepted', value: 88}, {name: 'Rejected', value: 12}]}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#800000" cornerRadius={10} />
                  <Cell fill="#FFC72C" cornerRadius={10} />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Percentage Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-800">88%</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Success</span>
            </div>
          </div>
          {/* Custom Legend */}
          <div className="mt-4 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#800000]"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accepted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFC72C]"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rejected</span>
            </div>
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
    <div className="relative bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
      <div className="relative flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.12em]">{title}</p>
          <h3 className="text-4xl font-black text-slate-800 tracking-tighter tracking-sans">{value}</h3>
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