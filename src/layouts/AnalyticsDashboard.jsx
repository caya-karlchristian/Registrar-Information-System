import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  PrinterIcon, XMarkIcon, DocumentTextIcon, CalendarDaysIcon, TableCellsIcon, UserGroupIcon, FunnelIcon 
} from '@heroicons/react/24/outline';

/* =========================================
   COMPONENT: SUMMARY & LOGBOOK MODAL
   ========================================= */
const SummaryLogbookModal = ({ isOpen, onClose, volumeData, documentData, statusData, statusColors }) => {
  // NEW: State for Filtering
  const [filterMode, setFilterMode] = useState('All'); // Options: 'All', 'Completed'

  if (!isOpen) return null;

  // --- STUDENT REQUEST DATA ---
  const requestLogs = [
    { id: 'REQ-2023-881', date: 'Oct 25, 2023', time: '08:30 AM', student: 'Juan Dela Cruz', document: 'Transcript of Records', status: 'Pending' },
    { id: 'REQ-2023-882', date: 'Oct 25, 2023', time: '09:15 AM', student: 'Maria Clara', document: 'Diploma', status: 'Processing' },
    { id: 'REQ-2023-883', date: 'Oct 25, 2023', time: '10:45 AM', student: 'Jose Rizal', document: 'Good Moral Certificate', status: 'Completed' },
    { id: 'REQ-2023-884', date: 'Oct 25, 2023', time: '01:20 PM', student: 'Andres Bonifacio', document: 'Honorable Dismissal', status: 'Pending' },
    { id: 'REQ-2023-885', date: 'Oct 25, 2023', time: '02:00 PM', student: 'Emilio Aguinaldo', document: 'Transcript of Records', status: 'Completed' },
    { id: 'REQ-2023-886', date: 'Oct 25, 2023', time: '02:45 PM', student: 'Apolinario Mabini', document: 'Certificate of Grades', status: 'Rejected' },
    { id: 'REQ-2023-887', date: 'Oct 25, 2023', time: '03:30 PM', student: 'Gabriela Silang', document: 'Diploma', status: 'Completed' },
    { id: 'REQ-2023-888', date: 'Oct 25, 2023', time: '04:15 PM', student: 'Antonio Luna', document: 'Good Moral Certificate', status: 'Processing' },
  ];

  // --- FILTER LOGIC ---
  const filteredLogs = filterMode === 'All' 
    ? requestLogs 
    : requestLogs.filter(log => log.status === 'Completed' || log.status === 'Ready to Claim');

  // --- EXCEL EXPORT FUNCTION (Respects Filter) ---
  const handleExportCSV = () => {
    const rows = [
      ["REGISTRAR REQUEST LOGBOOK"],
      ["Generated on", new Date().toLocaleString()],
      ["Filter Applied", filterMode],
      [], 
      ["EXECUTIVE SUMMARY"],
      ["Total Transactions", "1,245"],
      ["Completion Rate", "92%"],
      [], 
      ["REQUEST LOGS"],
      ["Transaction ID", "Date", "Time", "Student Name", "Document Requested", "Status"], 
    ];

    filteredLogs.forEach(log => {
      rows.push([
        log.id, log.date, log.time, `"${log.student}"`, `"${log.document}"`, log.status
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Request_Logbook_${filterMode}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-30 backdrop-blur-md print:p-0 print:bg-white print:static">
      
      {/* Modal Container */}
      <div className="bg-white w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[95vh] rounded-xl shadow-2xl flex flex-col print:shadow-none print:w-full print:h-full print:max-h-full print:rounded-none">
        
        {/* --- HEADER (Screen Only) --- */}
        <div className="flex justify-between items-center p-6 border-b print:hidden">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <UserGroupIcon className="w-6 h-6 text-pup-maroon" />
            Student Request Logbook
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* --- SCROLLABLE CONTENT AREA --- */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible">
          
          {/* PRINTABLE HEADER */}
          <div className="mb-8 text-center hidden print:block">
            <h1 className="text-2xl font-bold uppercase tracking-wide">Polytechnic University of the Philippines</h1>
            <h2 className="text-lg font-semibold">Office of the Registrar</h2>
            <p className="text-sm text-gray-500 mt-2">Taguig Branch • Gen. Santos Ave, Lower Bicutan, Taguig</p>
            <div className="border-b-2 border-black mt-4 mb-6"></div>
            <h3 className="text-xl font-bold uppercase mb-4">Request Logbook Report</h3>
          </div>

          {/* 1. EXECUTIVE SUMMARY SECTION */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-blue-600 pl-3 uppercase">Executive Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 print:border-gray-300 print:bg-blue-50">
                <p className="text-xs text-blue-600 uppercase font-bold mb-1">Total Transactions</p>
                <p className="text-3xl font-bold text-gray-800">1,245</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg border border-green-100 print:border-gray-300 print:bg-green-50">
                <p className="text-xs text-green-600 uppercase font-bold mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-800">92%</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 print:border-gray-300 print:bg-purple-50">
                <p className="text-xs text-purple-600 uppercase font-bold mb-1">Avg. Processing Time</p>
                <p className="text-3xl font-bold text-gray-800">2.5 <span className="text-lg font-normal text-gray-500">days</span></p>
              </div>
            </div>
          </div>

          {/* 2. VISUAL ANALYTICS (CHARTS FOR PRINT) */}
          <div className="mb-8 break-inside-avoid">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-l-4 border-pup-maroon pl-3 uppercase">Visual Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
              <div className="border p-4 rounded-lg bg-white print:border-gray-300">
                <h4 className="text-sm font-bold text-gray-600 mb-2 text-center">Request Volume (Annual)</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={volumeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 10}} interval={1} />
                      <YAxis tick={{fontSize: 10}} />
                      <Line type="monotone" dataKey="value" stroke="#D6584F" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="border p-4 rounded-lg bg-white print:border-gray-300">
                <h4 className="text-sm font-bold text-gray-600 mb-2 text-center">Current Status Distribution</h4>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        isAnimationActive={false}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={statusColors[index % statusColors.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* 3. STUDENT REQUEST LOGBOOK TABLE */}
          <div className="break-before-auto">
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-lg font-bold text-gray-800 border-l-4 border-orange-500 pl-3 uppercase">Requests Log</h3>
              
              {/* FILTER BUTTONS */}
              <div className="flex gap-2 print:hidden">
                 <button 
                    onClick={() => setFilterMode('All')}
                    className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1 transition ${filterMode === 'All' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                 >
                    All Requests
                 </button>
                 <button 
                    onClick={() => setFilterMode('Completed')}
                    className={`text-xs px-3 py-1 rounded-full border flex items-center gap-1 transition ${filterMode === 'Completed' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                 >
                    <FunnelIcon className="w-3 h-3" />
                    Completed Only
                 </button>
              </div>
              <span className="text-sm text-gray-500 hidden print:flex items-center gap-1">
                <CalendarDaysIcon className="w-4 h-4" /> October 25, 2023
              </span>
            </div>
            
            <div className="border rounded-lg overflow-hidden print:border-gray-800">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs print:bg-gray-200 print:text-black">
                  <tr>
                    <th className="px-4 py-3 border-b border-gray-200 print:border-gray-800">ID</th>
                    <th className="px-4 py-3 border-b border-gray-200 print:border-gray-800">Time</th>
                    <th className="px-4 py-3 border-b border-gray-200 print:border-gray-800">Student Name</th>
                    <th className="px-4 py-3 border-b border-gray-200 print:border-gray-800">Document</th>
                    <th className="px-4 py-3 border-b border-gray-200 print:border-gray-800">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 print:divide-gray-400">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="break-inside-avoid hover:bg-gray-50 print:hover:bg-transparent">
                        <td className="px-4 py-2 font-mono text-gray-500 text-xs">{log.id}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{log.time}</td>
                        <td className="px-4 py-2 font-bold text-gray-800">{log.student}</td>
                        <td className="px-4 py-2 text-gray-600">{log.document}</td>
                        <td className="px-4 py-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${
                              log.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              log.status === 'Processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              log.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                              log.status === 'Ready to Claim' ? 'bg-green-50 text-green-700 border-green-200' :
                              log.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                          } print:border-gray-400 print:text-black print:bg-transparent`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500 italic">
                        No requests found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PRINTABLE FOOTER */}
          <div className="mt-16 hidden print:block break-inside-avoid">
            <div className="grid grid-cols-2 gap-10">
              <div>
                <p className="text-sm font-bold uppercase mb-8">Prepared By:</p>
                <div className="border-b border-black w-2/3 mb-2"></div>
                <p className="text-xs">System Administrator</p>
              </div>
              <div>
                <p className="text-sm font-bold uppercase mb-8">Noted By:</p>
                <div className="border-b border-black w-2/3 mb-2"></div>
                <p className="text-xs">Head Registrar</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-10 text-center">Generated automatically via RIS Analytics Module • {new Date().toLocaleString()}</p>
          </div>

        </div>

        {/* --- FOOTER ACTIONS (Screen Only) --- */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl print:hidden">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-white hover:shadow-sm rounded-lg transition border border-transparent hover:border-gray-200">
            Cancel
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition shadow-lg hover:shadow-xl">
            <TableCellsIcon className="w-4 h-4" />
            Export to Excel
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition shadow-lg hover:shadow-xl">
            <PrinterIcon className="w-4 h-4" />
            Print Report
          </button>
        </div>

      </div>
    </div>
  );
};

/* =========================================
   MAIN COMPONENT
   ========================================= */
const AnalyticsDashboard = () => {  
  const [isReportOpen, setIsReportOpen] = useState(false);

  // 1. Line Chart Data (Volume)
  const volumeData = [
    { name: 'Jan', value: 50 }, { name: 'Feb', value: 60 }, { name: 'March', value: 75 },
    { name: 'April', value: 80 }, { name: 'May', value: 100 }, { name: 'June', value: 120 },
    { name: 'July', value: 150 }, { name: 'August', value: 130 }, { name: 'Sept', value: 110 },
    { name: 'Oct', value: 90 }, { name: 'Nov', value: 70 }, { name: 'Dec', value: 60 },
  ];

  // 2. Bar Chart Data (Top Documents)
  const documentData = [
    { name: 'TOR', count: 25, color: '#C53030' },    
    { name: 'COG', count: 15, color: '#ED8936' },      
    { name: 'Diploma', count: 20, color: '#ECC94B' },   
    { name: 'Good Moral', count: 20, color: '#48BB78' },
    { name: 'ID', count: 10, color: '#4299E1' },        
    { name: 'Cert', count: 10, color: '#9F7AEA' },      
  ];

  // 3. Pie Chart Data (Status)
  const statusData = [
    { name: 'Pending', value: 75 },
    { name: 'Claimed', value: 25 },
  ];
  
  const STATUS_COLORS = ['#C53030', '#4299E1']; 

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xl font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans print:hidden">
      
      {/* Header Row (Button Removed) */}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">

        <div className="space-y-10">
          {/* CHART 1: LINE CHART */}
          <div className="border border-gray-300 p-4 rounded bg-white">
            <h2 className="text-2xl font-bold text-pup-maroon uppercase mb-1">Request Volume by Month</h2>
            <p className="text-gray-600 mb-6 text-sm">Here's the number of documents accumulated per month</p>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={volumeData}>
                  <CartesianGrid strokeDasharray="3 1" vertical={true} stroke="#eee" />
                  <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Line type="linear" dataKey="value" stroke="#D6584F" strokeWidth={2} dot={{ r: 3, fill: '#D6584F', strokeWidth: 1 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CHART 2: BAR CHART */}
          <div className="border border-gray-300 p-4 rounded bg-white">
            <h2 className="text-2xl font-bold text-pup-maroon uppercase mb-1">Top 5 Documents</h2>
            <p className="text-gray-600 mb-6 text-sm">Here's the top most requested documents</p>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={documentData} barSize={45}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={false} axisLine={true} /> 
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {documentData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Pie Chart */}
        <div className="flex flex-col items-center justify-start pt-4">
          <h2 className="text-2xl font-bold text-pup-maroon uppercase mb-8">Status Breakdown</h2>
          
          <div className="w-full h-96 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={160}
                  fill="#8884d8"
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[index % STATUS_COLORS.length]} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center mt-4">
            <p className="font-medium text-gray-800 text-lg">Pending VS Claimed</p>
            <p className="text-sm text-gray-600 mt-1">Provides a real-time snapshot of the current office workload</p>
          </div>

          {/* --- NEW BUTTON LOCATION --- */}
          <div className="mt-10 w-full flex justify-center">
            <button 
              onClick={() => setIsReportOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg transition transform hover:scale-105"
            >
              <DocumentTextIcon className="w-6 h-6" />
              Generate Report
            </button>
          </div>

        </div>

      </div>

      {/* Modal Rendering */}
      <SummaryLogbookModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)}
        volumeData={volumeData}
        documentData={documentData}
        statusData={statusData}
        statusColors={STATUS_COLORS}
      />
    </div>
  );
};

export default AnalyticsDashboard;