import React from 'react';
import { 
  DocumentTextIcon, 
  BellAlertIcon, 
  CheckCircleIcon, 
  ClockIcon 
} from '@heroicons/react/24/solid';

const AnalyticsSummary = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-2 px-2 border-pup-yellow border-b-[5px]">
      
      {/* Card 1: Total Requests */}
      <div className="bg-white p-6 lg:mb-5 rounded-lg shadow-sm border-t-4 border-[#800000]">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Requests</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-2">1,245</h3>
          </div>
          <div className="p-3 bg-red-50 rounded-full text-[#800000]">
            <DocumentTextIcon className="w-6 h-6 " />
          </div>
        </div>
        <p className="text-green-600 text-xs mt-2 font-medium">↑ 12% from last month</p> {/* ADD LOGIC */}
      </div>

      {/* Card 2: Pending Review (Used BellAlertIcon here) */}
      <div className="bg-white p-6 lg:mb-5 rounded-lg shadow-sm border-t-4 border-yellow-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pending Review</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-2">1902</h3> 
          </div>
          <div className="p-3 bg-yellow-50 rounded-full text-yellow-600">
            <BellAlertIcon className="w-6 h-6" />
          </div>
        </div>
        <p className="text-yellow-600 text-xs mt-2 font-medium">Action required</p>
      </div>

      {/* Card 3: Claimed Documents */}
      <div className="bg-white p-6 lg:mb-5 md:mb-5 rounded-lg shadow-sm border-t-4 border-blue-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Claimed Docs</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-2">90</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-full text-blue-600">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
        </div>
        <p className="text-blue-600 text-xs mt-2 font-medium">75% Completion Rate</p> {/* ADD LOGIC */}
      </div>

      {/* Card 4: Processing Time */}
      <div className="bg-white p-6 mb-5 rounded-lg shadow-sm border-t-4 border-green-500">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Avg. Time</p>
            <h3 className="text-3xl font-extrabold text-gray-800 mt-2">3 Days</h3> {/* ADD LOGIC */}
          </div>
          <div className="p-3 bg-green-50 rounded-full text-green-600">
            <ClockIcon className="w-6 h-6" />
          </div>
        </div>
        <p className="text-green-600 text-xs mt-2 font-medium">On track</p>
      </div>

    </div>
  );
};

export default AnalyticsSummary;