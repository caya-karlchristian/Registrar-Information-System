import React, { useState, useEffect, useMemo } from 'react';
import { PrinterIcon } from '@heroicons/react/24/solid';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// --- REMOVE WHEN BACKEND INTEGRATES ---
const generateMockData = () => {
  const sections = ["BSIT 1-A", "BSIT 2-B", "BSCS 3-A", "BSBA 1-C", "Educ 4-A", "Crim 2-B"];
  const activities = [
    "Requested Transcript of Records",
    "Submitted Graduation Clearance",
    "Inquired about Enrollment Status"
  ];
  const names = [
    "Juan Dela Cruz", "Maria Clara", "Jose Rizal", "Andres Bonifacio", 
    "Gabriela Silang", "Emilio Aguinaldo", "Melchora Aquino", "Apolinario Mabini"
  ];

  return Array.from({ length: 45 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i); 
    
    return {
      id: i + 1,
      date: date.toLocaleDateString('en-GB'),
      name: names[i % names.length],
      activity: activities[i % activities.length],
      timeIn: "08:30 AM",
      timeOut: "09:15 AM",
      section: sections[i % sections.length]
    };
  });
};

const LogbookRecords = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10; 

  useEffect(() => {
    setTimeout(() => {
      setData(generateMockData());
      setLoading(false);
    }, 500);
  }, []);

  const totalPages = Math.ceil(data.length / rowsPerPage);
  
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [currentPage, data]);

  const emptyRows = rowsPerPage - currentData.length;

  const handlePrint = () => window.print();

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPaginationButtons = () => {
    const buttons = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) buttons.push(i);
    } else {
      if (currentPage <= 3) {
        buttons.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        buttons.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        buttons.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return buttons;
  };

  // Define Columns
  const columns = [
    { label: "Date", width: "w-[12%]" },
    { label: "Name", width: "w-[20%]" },
    { label: "Activity", width: "w-[25%]" },
    { label: "Time In", width: "w-[12%]" },
    { label: "Time Out", width: "w-[12%]" },
    { label: "Section", width: "w-[19%]" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 font-sans">

      <div className="w-full max-w-7xl bg-pup-dark-maroon rounded-lg shadow-2xl overflow-hidden relative pb-12 print:max-w-none print:shadow-none">
        
        <div className="absolute top-0 left-0 w-full h-4 bg-[#fbbf24] print:hidden"></div>

        <div className="px-6 py-10 md:px-12 md:pt-14 md:pb-6">
          
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4 md:gap-0">
            <h1 className="text-white text-3xl md:text-4xl font-bold tracking-wide text-center md:text-left">
              Logbook Records
            </h1>
            <button 
              onClick={handlePrint}
              className="bg-[#fbbf24] hover:bg-[#f59e0b] text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-lg text-base print:hidden w-full md:w-auto justify-center"
            >
              <PrinterIcon className="h-6 w-6" />
              <span>Print</span>
            </button>
          </div>

          {/* Table Container */}
          <div className="w-full text-white overflow-x-auto">
            <div className="min-w-[900px]">
              
              {/* Headers */}
              <div className="flex border-b border-white/30 pb-4 mb-2 text-base font-semibold uppercase tracking-wider text-white/80">
                {columns.map((col, index) => (
                  <div key={index} className={`${col.width} px-4`}>
                    {col.label}
                  </div>
                ))}
              </div>

              {/* Loading State */}
              {loading && (
                <div className="py-24 text-center text-white/50 animate-pulse text-lg">
                  Loading Records...
                </div>
              )}

              {/* Data Rows */}
              {!loading && currentData.length > 0 && currentData.map((row) => (
                <div 
                  key={row.id} 
                  className="flex border-b border-white/20 py-4 text-base text-white/90 hover:bg-white/5 transition-colors items-center"
                >
                  <div className={`${columns[0].width} px-4`}>{row.date}</div>
                  <div className={`${columns[1].width} px-4 font-medium truncate`}>{row.name}</div>
                  <div className={`${columns[2].width} px-4 truncate`} title={row.activity}>{row.activity}</div>
                  <div className={`${columns[3].width} px-4`}>{row.timeIn}</div>
                  <div className={`${columns[4].width} px-4`}>{row.timeOut}</div>
                  <div className={`${columns[5].width} px-4 text-white/80`}>
                    {row.section}
                  </div>
                </div>
              ))}

              {/* No Data State */}
              {!loading && currentData.length === 0 && (
                <div className="py-12 text-center text-white/40 italic border-b border-white/20">
                  No records found.
                </div>
              )}

              {/* Empty Rows Fillers */}
              {!loading && Array.from({ length: Math.max(0, emptyRows) }).map((_, i) => (
                <div 
                  key={`empty-${i}`} 
                  className="w-full border-b border-white/20 h-[57px]" 
                ></div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {!loading && data.length > 0 && (
            <div className="flex justify-center items-center mt-10 gap-4 text-white/70 text-base font-medium select-none print:hidden">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-2 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2"
              >
                <ChevronLeftIcon className="h-5 w-5" />
                <span className="hidden md:inline">Previous</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="md:hidden text-white px-2">
                  Page {currentPage} of {totalPages}
                </span>

                <div className="hidden md:flex items-center gap-2">
                  {getPaginationButtons().map((btn, index) => {
                    if (btn === '...') return <span key={index} className="px-2 text-xl">...</span>;
                    return (
                      <button
                        key={index}
                        onClick={() => handlePageChange(btn)}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 text-lg
                          ${currentPage === btn 
                            ? 'bg-[#fbbf24] text-[#4a1212] font-bold shadow-md scale-110' 
                            : 'hover:bg-white/10 hover:text-white'
                          }`}
                      >
                        {btn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2"
              >
                <span className="hidden md:inline">Next</span>
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogbookRecords;