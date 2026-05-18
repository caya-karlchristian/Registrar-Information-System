import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const ImageUploader = ({ label, name, required, value, onChange }) => {
  const [preview, setPreview] = useState(null);
  const { isDark } = useTheme();

  // Update preview whenever the value (file) changes
  useEffect(() => {
    if (value) {
      const objectUrl = URL.createObjectURL(value);
      setPreview(objectUrl);
      // Free memory when component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreview(null);
    }
  }, [value]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Send the file and name back to the parent
      onChange(name, file);
    }
  };

  return (
    <div className="mt-2">
      <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-[#e4e6eb]' : 'text-gray-200'}`}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      
      <div className="flex items-center justify-center w-full">
        <label 
          htmlFor={name} 
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors relative overflow-hidden group ${isDark ? 'border-[#3e4042] bg-[#242526] hover:bg-[#2b2c2d]' : 'border-white/30 bg-white/5 hover:bg-white/10'}`}
        >
          
          {preview ? (
            <div className={`relative w-full h-full flex items-center justify-center ${isDark ? 'bg-[#1a1b1e]/80' : 'bg-black/50'}`}>
               <img 
                 src={preview} 
                 alt="Preview" 
                 className="h-full object-contain p-2 z-10" 
               />
               <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 ${isDark ? 'bg-black/60' : 'bg-black/60'}`}>
                  <p className="text-white font-bold text-sm">Click to Change</p>
               </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className={`w-10 h-10 mb-3 ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <p className={`mb-2 text-sm ${isDark ? 'text-[#b0b3b8]' : 'text-gray-400'}`}><span className="font-semibold text-pup-yellow">Click to upload</span></p>
              <p className={`text-xs ${isDark ? 'text-[#84888f]' : 'text-gray-500'}`}>PNG, JPG (MAX. 5MB)</p>
            </div>
          )}

          <input 
            id={name} 
            name={name}
            type="file" 
            accept="image/*"
            className="hidden" 
            onChange={handleFileChange}
            required={required && !value} 
          />
        </label>
      </div>
    </div>
  );
};

export default ImageUploader;