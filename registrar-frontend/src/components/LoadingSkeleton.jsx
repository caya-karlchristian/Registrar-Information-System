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
    <div className={`relative min-h-screen font-sans text-left z-20 animate-pulse ${isDark ? 'bg-[#18191a] text-[#e4e6eb]' : 'bg-white text-gray-900'}`}>
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

export default function LoadingSkeleton({ isDark, variant = 'chart' }) {
  if (variant === 'stat') return <StatCardSkeleton isDark={isDark} />;
  if (variant === 'logbook') return <LogbookSkeleton isDark={isDark} />;
  return <ChartCardSkeleton isDark={isDark} />;
}
