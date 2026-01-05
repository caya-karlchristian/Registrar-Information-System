import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const AnalyticsDashboard = () => {  
  // 1. Line Chart Data (Volume)
  const volumeData = [
    { name: 'Jan', value: 50 },
    { name: 'Feb', value: 60 },
    { name: 'March', value: 75 },
    { name: 'April', value: 80 },
    { name: 'May', value: 100 },
    { name: 'June', value: 120 },
    { name: 'July', value: 150 },
    { name: 'August', value: 130 },
    { name: 'Sept', value: 110 },
    { name: 'Oct', value: 90 },
    { name: 'Nov', value: 70 },
    { name: 'Dec', value: 60 },
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
  
  // Map colors to status names for easier lookup if needed, or just rely on order
  const STATUS_COLORS = ['#C53030', '#4299E1']; 

  // --- CUSTOM LABEL FOR PIE CHART ---
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central" 
        className="text-xl font-bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="p-6 bg-white min-h-screen font-sans">
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
                  <XAxis 
                    dataKey="name" 
                    tick={{fontSize: 12}} 
                    interval={0} 
                  />
                  <YAxis tick={{fontSize: 12}} />
                  <Tooltip />
                  <Line 
                    type="linear" 
                    dataKey="value" 
                    stroke="#D6584F" 
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#D6584F', strokeWidth: 1 }}
                    activeDot={{ r: 6 }}
                  />
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
                    <Cell 
                      key={entry.name} 
                      fill={STATUS_COLORS[index % STATUS_COLORS.length]} 
                      stroke="white" 
                      strokeWidth={2}
                    />
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
        </div>

      </div>
    </div>
  );
};

export default AnalyticsDashboard;