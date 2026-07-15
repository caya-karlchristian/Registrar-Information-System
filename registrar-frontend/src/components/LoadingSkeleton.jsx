import React from 'react';

export const StatCardSkeleton = ({ isDark }) => {
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-100';
  const bgDim = isDark ? 'bg-[#2f3133]' : 'bg-slate-50';

  return (
    <div className={`relative p-6 rounded-4xl border shadow-sm animate-pulse ${isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-slate-200'}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-3 w-full">
          <div className={`h-3 w-24 rounded-full ${bg}`} />
          <div className={`h-10 w-32 rounded-xl ${bg}`} />
        </div>
        <div className={`w-12 h-12 rounded-2xl ${bgDim}`} />
      </div>

      <div className="mt-6 flex items-center gap-2">
        <div className={`h-7 w-36 rounded-full ${bg}`} />
      </div>
    </div>
  );
};

export const ChartCardSkeleton = ({ isDark }) => {
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-100';
  const bgDim = isDark ? 'bg-[#2f3133]' : 'bg-slate-50';

  return (
    <div className={`border p-6 rounded-4xl shadow-sm min-w-0 animate-pulse ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-slate-200 bg-white'}`}>
      <div className="mb-4 space-y-2">
        <div className={`h-5 w-40 rounded-full ${bg}`} />
        <div className={`h-3 w-28 rounded-full ${bgDim}`} />
      </div>

      <div className="h-64 flex items-end gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-xl ${bg}`}
            style={{ height: `${25 + ((i * 9) % 55)}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export const LogbookSkeleton = ({ isDark }) => {
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-100';
  const bgDim = isDark ? 'bg-[#2f3133]' : 'bg-slate-50';
  const border = isDark ? 'border-[#3e4042]' : 'border-gray-200';

  const Cell = ({ w = 'w-20' }) => (
    <td className="p-3 sm:p-4 text-center whitespace-nowrap">
      <div className={`h-3 ${w} mx-auto rounded-full ${bg}`} />
    </td>
  );

  return (
    <div className={`relative min-h-full font-sans text-left z-20 animate-pulse ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-white text-gray-900'}`}>
      <div className={`max-w-350 mx-auto shadow-md rounded-sm flex flex-col min-h-150 print:p-0 print:shadow-none ${isDark ? 'bg-[#242526]' : 'bg-white'}`}>

        <div className="p-3 sm:p-4 md:p-4 pb-0">
          <div className="mb-4 grid grid-cols-1 gap-3 print:hidden lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <div className={`h-10 w-full rounded-lg ${bg}`} />
              <div className={`h-10 w-full rounded-lg ${bgDim}`} />
            </div>
            <div className={`h-9 w-36 rounded-md ${bg}`} />
          </div>

          <div className={`w-full border-b pb-3 mb-0 ${border}`}>
            <div className={`h-6 w-64 max-w-full mx-auto rounded-full ${bg}`} />
            <div className={`h-3 w-56 max-w-full mx-auto rounded-full mt-2 ${bgDim}`} />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto px-4 sm:px-6 md:px-6">
          <table className="w-full min-w-225 border-collapse md:min-w-full">
            <thead>
              <tr className={`border-b-2 ${border}`}>
                {[14, 16, 12, 20, 14, 10, 14].map((w, i) => (
                  <th key={i} className="py-4 px-2">
                    <div className={`h-3 min-w-10 mx-auto rounded-full ${bgDim}`} style={{ width: `${w}%` }} />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className={`border-b ${border}`}>
                  <Cell w="w-28" />
                  <Cell w="w-36" />
                  <Cell w="w-24" />
                  <Cell w="w-40" />
                  <Cell w="w-28" />
                  <Cell w="w-20" />
                  <Cell w="w-24" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-t ${border}`}>
          <div className={`h-4 w-64 rounded-full ${bgDim}`} />
          <div className="flex gap-4 items-center">
            <div className={`w-6 h-6 rounded ${bg}`} />
            <div className={`h-4 w-24 rounded-full ${bgDim}`} />
            <div className={`w-6 h-6 rounded ${bg}`} />
          </div>
        </div>

      </div>
    </div>
  );
};

export const InboxListSkeleton = ({ isDark, count = 6 }) => {
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-200';
  const bgDim = isDark ? 'bg-[#2f3133]' : 'bg-slate-100';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`w-full text-left px-4 py-3 border-b ${isDark ? 'border-[#3e4042]' : 'border-gray-200'} animate-pulse`}>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className={`h-4 w-1/2 rounded-full ${bg}`} />
            <div className={`h-3 w-12 rounded-full ${bgDim}`} />
          </div>
          <div className={`h-3 w-3/4 rounded-full mt-2.5 ${bgDim}`} />
          <div className={`h-3 w-full rounded-full mt-2 ${bg}`} />
          <div className={`h-3 w-5/6 rounded-full mt-1 ${bgDim}`} />
        </div>
      ))}
    </>
  );
};

export const InboxPreviewSkeleton = ({ isDark }) => {
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-200';
  const bgDim = isDark ? 'bg-[#2f3133]' : 'bg-slate-100';

  return (
    <div className={`flex flex-col h-full animate-pulse ${isDark ? 'bg-[#242526]' : 'bg-white'}`}>
      <header className={`px-4 md:px-6 py-4 border-b ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
        <div className={`h-3 w-32 rounded-full mb-3 ${bgDim}`} />
        <div className={`h-6 w-3/4 rounded-lg mb-3 ${bg}`} />
        <div className={`h-4 w-40 rounded-full ${bgDim}`} />
      </header>

      <div className={`flex-1 p-4 md:p-6 space-y-4 ${isDark ? 'bg-[#1a1b1e]' : 'bg-gray-50'}`}>
        <div className={`rounded-lg border px-4 py-4 ${isDark ? 'border-[#3e4042] bg-[#242526]' : 'border-gray-200 bg-white'}`}>
          <div className={`h-3 w-32 rounded-full mb-5 ${bgDim}`} />
          <div className="space-y-4">
            <div className={`h-4 w-1/3 rounded-full ${bg}`} />
            <div className={`h-4 w-1/4 rounded-full ${bg}`} />
            <div className={`h-4 w-full rounded-full ${bgDim}`} />
            <div className={`h-4 w-5/6 rounded-full ${bgDim}`} />
            <div className={`h-4 w-4/6 rounded-full ${bgDim}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Add this export to your existing LoadingSkeleton.jsx file

export const DocumentListSkeleton = ({ isDark, count = 8 }) => {
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-200';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`h-21 w-full border rounded-4xl flex items-center justify-between p-7 animate-pulse shadow-sm ${
            isDark ? 'bg-[#242526] border-[#3e4042]' : 'bg-white border-gray-200'
          }`}
        >
          {/* Title Placeholder */}
          <div className={`h-5 w-2/3 md:w-1/2 rounded-md ${bg}`} />
          {/* Chevron Placeholder */}
          <div className={`w-8 h-8 rounded-full shrink-0 ${bg}`} />
        </div>
      ))}
    </>
  );
};

export const UserTableSkeleton = ({ isDark, count = 7 }) => {
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-200';
  const bgDim = isDark ? 'bg-[#2f3133]' : 'bg-slate-100';
  const borderColor = isDark ? 'border-[#3e4042]' : 'border-gray-50';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className={`border-b text-center animate-pulse ${borderColor}`}>
          {/* Checkbox */}
          <td className="px-4 py-3">
            <div className={`w-4 h-4 mx-auto rounded ${bg}`} />
          </td>
          
          {/* Name */}
          <td className="px-4 py-3">
            <div className={`h-4 w-24 mx-auto rounded-md ${bg}`} />
          </td>
          
          {/* Email */}
          <td className="px-4 py-3">
            <div className={`h-4 w-32 mx-auto rounded-md ${bgDim}`} />
          </td>
          
          {/* Role Badge */}
          <td className="px-4 py-3">
            <div className={`h-6 w-20 mx-auto rounded-full ${bg}`} />
          </td>
          
          {/* Policy attached */}
          <td className="px-6 py-4">
            <div className={`h-6 w-24 mx-auto rounded-full ${bgDim}`} />
          </td>
          
          {/* Joined Date */}
          <td className="px-4 py-3">
            <div className={`h-4 w-20 mx-auto rounded-md ${bgDim}`} />
          </td>
          
          {/* Status Badge */}
          <td className="px-4 py-3">
            <div className={`h-6 w-20 mx-auto rounded-full ${bg}`} />
          </td>
          
          {/* Access */}
          <td className="px-6 py-4">
            <div className={`h-7 w-28 mx-auto rounded-full ${bg}`} />
          </td>
          
          {/* Actions */}
          <td className="px-4 py-3">
            <div className="flex items-center justify-center">
              <div className={`w-4 h-4 rounded ${bgDim}`} />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

export const ReportTableSkeleton = ({ isDark, count = 10 }) => {
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-200';
  const bgDim = isDark ? 'bg-[#2f3133]' : 'bg-slate-100';
  const borderColor = isDark ? 'border-[#3e4042]' : 'border-gray-50';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className={`border-b text-center animate-pulse ${borderColor}`}>
          {/* Timestamp */}
          <td className="px-4 py-3">
            <div className={`h-3 w-28 mx-auto rounded-md ${bgDim}`} />
          </td>
          
          {/* User Email */}
          <td className="px-4 py-3">
            <div className={`h-4 w-40 mx-auto rounded-md ${bg}`} />
          </td>
          
          {/* Role Badge */}
          <td className="px-4 py-3">
            <div className={`h-6 w-20 mx-auto rounded-full ${bg}`} />
          </td>
          
          {/* Action Badge */}
          <td className="px-4 py-3">
            <div className={`h-6 w-24 mx-auto rounded-full ${bgDim}`} />
          </td>
          
          {/* Browser Info */}
          <td className="px-4 py-3">
            <div className={`h-3 w-32 mx-auto rounded-md ${bgDim}`} />
          </td>
        </tr>
      ))}
    </>
  );
};

export const AnnouncementSkeleton = ({ isDark, count = 4 }) => {
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-200';
  const bgDim = isDark ? 'bg-[#2f3133]' : 'bg-slate-100';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`rounded-xl px-4 py-4 mb-3 animate-pulse ${isDark ? 'bg-[#1f1f1f] border border-[#3e4042]' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`h-4 w-1/3 rounded-full ${bg}`} />
            <div className={`h-6 w-10 rounded-full ${bgDim}`} />
          </div>
          <div className={`h-3 w-full rounded-full mt-2 ${bgDim}`} />
          <div className={`h-3 w-4/5 rounded-full mt-2 ${bgDim}`} />
        </div>
      ))}
    </>
  );
};

export const DocumentSkeleton = ({ isDark, count = 5 }) => {
  const baseBg = isDark ? 'bg-[#3a3b3c]' : 'bg-gray-300';
  const iconBg = isDark ? 'bg-[#3a3b3c]]' : 'bg-gray-300';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i} 
          className="flex items-center justify-between px-3 py-4 mb-1 animate-pulse"
        >
          {/* Document Name Placeholder */}
          <div className={`h-4 w-40 rounded-md ${baseBg}`} />
          
          {/* Action Icons Placeholder */}
          <div className="flex gap-2">
            <div className={`w-4 h-4 rounded ${iconBg}`} />
            <div className={`w-4 h-4 rounded ${iconBg}`} />
          </div>
        </div>
      ))}
    </>
  );
};

export const PolicyTableSkeleton = ({ isDark, count = 5 }) => {
  const bg = isDark ? 'bg-[#3a3b3c]' : 'bg-slate-200';
  const bgDim = isDark ? 'bg-[#2f3133]' : 'bg-slate-100';
  const borderColor = isDark ? 'border-[#3e4042]' : 'border-gray-50';

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className={`border-b text-left animate-pulse ${borderColor}`}>
          {/* Checkbox Select cell */}
          <td className="px-4 py-3 text-center">
            <div className={`w-4 h-4 mx-auto rounded ${bg}`} />
          </td>

          {/* Cube Block symbol */}
          <td className="px-2 py-3 text-center">
            <div className={`w-5 h-5 mx-auto rounded ${bg}`} />
          </td>

          {/* Policy name */}
          <td className="px-4 py-3">
            <div className={`h-4 w-40 rounded-md ${bg}`} />
          </td>

          {/* Type */}
          <td className="px-4 py-3">
            <div className={`h-4 w-16 rounded-md ${bgDim}`} />
          </td>

          {/* Assigned admins count link */}
          <td className="px-4 py-3">
            <div className={`h-4 w-32 rounded-md ${bg}`} />
          </td>

          {/* Description */}
          <td className="px-4 py-3">
            <div className={`h-4 w-60 rounded-md ${bgDim}`} />
          </td>
        </tr>
      ))}
    </>
  );
};

export default function LoadingSkeleton({ isDark, variant = 'chart' }) {
  if (variant === 'stat') return <StatCardSkeleton isDark={isDark} />;
  if (variant === 'logbook') return <LogbookSkeleton isDark={isDark} />;
  if (variant === 'policy') return <PolicyTableSkeleton isDark={isDark} />;
  return <ChartCardSkeleton isDark={isDark} />;
}
