import React, { useState } from 'react'; 

const StudentDashboard = () => {
    const [activeTab, setActiveTab] = useState('pending, history, ready'); // 'pending', 'ready', 'history'

    // Sample data for requests (REMOVE this when integrating with backend)
    const requests = [
       { id: 'REQ-001', doc: 'Transcript of Records', date: 'Dec 24, 2025', status: 'Pending', type: 'pending' },
       { id: 'REQ-002', doc: 'Honorable Dismissal', date: 'Dec 20, 2025', status: 'Ready to Claim', type: 'ready' },
       { id: 'REQ-003', doc: 'Certificate of Grades', date: 'Nov 15, 2025', status: 'Completed', type: 'history' },  
    ]; 

    const filteredRequests = requests.filter(req => req.type === activeTab);

    return (
    <main className="max-w-6xl mx-auto px-4 py-8 relative z-20">
        
        <div className="grid grid-cols-3 md:grid-cols-3 gap-4 place-items-center mb-8">
            <div className="w-full flex justify-center">  
             <button 
               onClick={() => setActiveTab('pending')} 
               className={`relative w-full max-w-xs p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-center gap-3 group ${
                 activeTab === 'pending' 
                 ? 'bg-yellow-50 border-yellow-500 shadow-lg scale-105' 
                 : 'bg-white border-gray-200 hover:bg-yellow-50 hover:border-yellow-200 hover:shadow-md'
               }`}
             >
               <span className={`font-bold text-lg ${activeTab === 'pending' ? 'text-yellow-900' : 'text-gray-500'}`}>Pending</span>
               <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                {requests.filter(req => req.type === 'pending').length} {/* update when integrating with backend */}
               </span>
             </button>
           </div>

            <div className="w-full flex justify-center">
             <button 
               onClick={() => setActiveTab('ready')} 
               className={`relative w-full max-w-xs p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-center gap-3 group ${
                 activeTab === 'ready' 
                 ? 'bg-green-50 border-green-500 shadow-lg scale-105' 
                 : 'bg-white border-gray-200 hover:bg-green-50 hover:border-green-200 hover:shadow-md'
               }`}
             >
               <span className={`font-bold text-lg ${activeTab === 'ready' ? 'text-green-900' : 'text-gray-500'}`}>To Claim</span>
               <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                {requests.filter(req => req.type === 'ready').length} {/* update when integrating with backend */}
               </span>
             </button>
           </div>

            <div className="w-full flex justify-center">
             <button 
               onClick={() => setActiveTab('history')} 
               className={`relative w-full max-w-xs p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-center gap-3 group ${
                 activeTab === 'history' 
                 ? 'bg-gray-100 border-gray-500 shadow-lg scale-105' 
                 : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md'
               }`}
             >
                <span className={`font-bold text-lg ${activeTab === 'history' ? 'text-gray-900' : 'text-gray-500'}`}>History</span>
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-sm ring-2 ring-white">
                    {requests.filter(req => req.type === 'history').length} {/* update when integrating with backend */}
                </span>
             </button>
           </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
            
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 text-lg">
                    {activeTab === 'pending' && 'Processing Documents'}
                    {activeTab === 'ready' && 'Documents Ready for Pickup'}
                    {activeTab === 'history' && 'Transaction Archive'}
                </h3>
                <span className="text-xs text-gray-400">Showing {filteredRequests.length} records</span>
            </div>
               
            <div className="divide-y divide-gray-100">
                {filteredRequests.length > 0 ? (
                    filteredRequests.map((req) => (
                        <div key={req.id} className="p-5 hover:bg-gray-50 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{req.id}</span>
                                    <span className="text-xs text-gray-400">{req.date}</span>
                                </div>
                                <h4 className="text-gray-800 font-bold text-base md:text-lg">{req.doc}</h4>
                                <p className={`text-sm font-medium mt-1
                                    ${req.status.includes('Pending') ? 'text-yellow-600' : ''}
                                    ${req.status.includes('Ready') ? 'text-green-600' : ''}
                                    ${req.status.includes('Completed') ? 'text-gray-500' : ''}
                                `}>
                                    Status: {req.status}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-10 text-center text-gray-400 justify-center items-center flex">
                        No records found.
                    </div>
                )}
            </div>
        </div>
    </main>
    );
};

export default StudentDashboard;