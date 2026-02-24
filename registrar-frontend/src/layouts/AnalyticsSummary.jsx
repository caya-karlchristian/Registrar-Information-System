import React, { useState } from 'react';
import { 
  DocumentTextIcon, 
  BellAlertIcon, 
  CheckCircleIcon, 
  ClockIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

const AnalyticsSummary = () => {
  const [dateRange, setDateRange] = useState('This Month');
  const [customDate, setCustomDate] = useState({ start: '', end: '' });

  return (
    <div className="space-y-3 px-4 py-2 rounded-3xl -mt-5">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full"> 
        <div className="md:ml-auto flex items-center gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-full md:w-auto">
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
              <input 
                type="date" 
                className="text-xs font-bold text-slate-600 bg-slate-50 p-1.5 rounded-lg outline-none border border-slate-100 focus:border-maroon-300 transition-all" 
                onChange={(e) => setCustomDate({...customDate, start: e.target.value})}
              />
              <div className="w-2 h-px bg-slate-300"></div>
              <input 
                type="date" 
                className="text-xs font-bold text-slate-600 bg-slate-50 p-1.5 rounded-lg outline-none border border-slate-100 focus:border-maroon-300 transition-all"
                onChange={(e) => setCustomDate({...customDate, end: e.target.value})}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Requests"
          value="1,245"
          trend="+12.5%"
          status="up" // Up is green for volume
          icon={<DocumentTextIcon className="w-6 h-6" />}
          lightColor="bg-red-50"
          iconColor="text-maroon-700"
        />

        <StatCard 
          title="Pending Review"
          value="1,902"
          trend="High Volume"
          status="neutral" // Neutral is yellow
          icon={<BellAlertIcon className="w-6 h-6" />}
          lightColor="bg-amber-50"
          iconColor="text-amber-700"
        />

        <StatCard 
          title="Claimed Docs"
          value="90"
          trend="-5.2%"
          status="down" // Down is red for completion rate
          icon={<CheckCircleIcon className="w-6 h-6" />}
          lightColor="bg-blue-50"
          iconColor="text-blue-700"
        />

        <StatCard 
          title="Avg. Processing"
          value="3.2d"
          trend="-0.5 days"
          status="up" // Note: "Up" here means improvement (lower time), so it's green
          icon={<ClockIcon className="w-6 h-6" />}
          lightColor="bg-emerald-50"
          iconColor="text-emerald-700"
        />
      </div>

      <div className="h-1.5 w-full bg-gradient-to-r from-[#FFD700] via-[#FACC15] to-[#FFD700] rounded-full opacity-40 shadow-sm" />
    </div>
  );
};

/* --- CLEAN STAT CARD (Static Design) --- */
const StatCard = ({ title, value, trend, status, icon, lightColor, iconColor }) => {
  // Determine color based on status
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
          <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{value}</h3>
        </div>
        <div className={`p-3 ${lightColor} ${iconColor} rounded-2xl shadow-sm`}>
          {icon}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${statusStyles[status] || statusStyles.neutral}`}>
          {status === 'up' && <ArrowTrendingUpIcon className="w-3 h-3" />}
          {status === 'down' && <ArrowTrendingDownIcon className="w-3 h-3" />}
          {trend}
        </div>
        <span className="text-[11px] text-slate-400 font-bold">vs last month</span>
      </div>
    </div>
  );
};

export default AnalyticsSummary;