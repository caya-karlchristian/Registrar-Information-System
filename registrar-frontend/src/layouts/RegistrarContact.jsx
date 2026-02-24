import React from "react";
import { 
  PaperClipIcon, 
  FaceSmileIcon, 
  PhotoIcon,
  TrashIcon,
  LinkIcon,
  EllipsisVerticalIcon,
  LanguageIcon,
} from "@heroicons/react/24/outline";

const SupportEmail = () => {
  return (
    <div className="w-full max-w-5xl mx-auto p-2 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white shadow-2xl shadow-gray-200/50 border border-gray-200 rounded-xl md:rounded-2xl flex flex-col overflow-hidden min-h-[500px] md:min-h-[650px]">
        
        <div className="px-4 md:px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[10px] md:text-xs font-black text-gray-800 uppercase tracking-widest">
            Send a new Message to RIS
          </h2>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-gray-200" />
            <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-gray-200" />
          </div>
        </div>

        {/* 2. Form Fields */}
        <div className="bg-white ">
          <div className="flex items-center px-4 md:px-6 py-3 border-b border-gray-50 group focus-within:bg-maroon-50/20 transition-colors">
            <label htmlFor="email-to" className="text-sm text-gray-400 w-12 md:w-16 font-semibold cursor-pointer">To: </label>
            <input 
              id="email-to"
              type="email" 
              className="flex-1 -ml-6 bg-transparent outline-none text-sm text-gray-700 min-w-0"
            />
          </div>
          <div className="flex items-center px-4 md:px-6 py-3 border-b border-gray-100 focus-within:bg-maroon-50/20 transition-colors">
            <label htmlFor="email-subject" className="text-sm text-gray-400 w-12 md:w-16 font-semibold cursor-pointer">Subject: </label>
            <input 
              id="email-subject"
              type="text" 
              className="flex-1 px-2 bg-transparent outline-none text-sm text-gray-700 font-medium min-w-0"
            />
          </div>
        </div>

        {/* 3. Text Area - Padding reduces on small screens */}
        <div className="flex-1 relative bg-white flex flex-col">
          <textarea 
            aria-label="Email Body"
            placeholder="Describe your request..."
            className="flex-1 w-full p-4 md:p-8 outline-none text-sm text-gray-600 resize-none leading-relaxed placeholder-gray-200"
          />
        </div>

        <div className="p-3 md:p-4 bg-gray-50/80 border-t border-gray-100 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <div className="flex items-center shadow-md shadow-red-900/10 rounded-full overflow-hidden shrink-0">
              <button className="bg-[#800000] hover:bg-[#600000] text-white px-4 md:px-8 py-2 md:py-2.5 text-xs md:text-sm font-black uppercase tracking-wider transition-all active:scale-95">
                Send
              </button>
            </div>

            <div className="flex items-center gap-0.5 text-gray-400 bg-white border border-gray-200 rounded-xl px-1 py-1 shadow-sm overflow-hidden">
              <ToolbarButton icon={<PaperClipIcon />} />
              <ToolbarButton icon={<LinkIcon />} />
              <div className="hidden sm:flex items-center gap-0.5">
                <ToolbarButton icon={<FaceSmileIcon />} />
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <ToolbarButton icon={<PhotoIcon />} />
                <ToolbarButton icon={<LanguageIcon />} />
              </div>
              <ToolbarButton icon={<EllipsisVerticalIcon />} />
            </div>
          </div>

          {/* Delete Icon - Stays on far right */}
          <button className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0" aria-label="Delete Draft">
            <TrashIcon className="w-5 h-5 md:w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ToolbarButton = ({ icon }) => (
  <button className="p-1.5 md:p-2 hover:text-[#800000] hover:bg-red-50 rounded-lg transition-all duration-200 shrink-0">
    {React.cloneElement(icon, { className: "w-4 h-4 md:w-5 h-5" })}
  </button>
);

export default SupportEmail;