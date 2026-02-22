import React from 'react';

const FieldGroup = ({ 
  label, 
  name, 
  value, 
  isEditing, 
  onChange, 
  type = "text", 
  ...props 
}) => {
  return (
    <div className="flex flex-col gap-1 h-[74px]">
      <label className="text-white font-bold text-sm tracking-wide ml-1">
        {label}
      </label>
      
      {isEditing ? (
        <input 
          type={type} 
          name={name}
          value={value}
          onChange={onChange}
          {...props} 
          className="w-full p-2.5 rounded text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#eebc48] border-none shadow-inner transition-all invalid:ring-2 invalid:ring-red-500"
        />
      ) : (
        <div className="w-full p-2.5 rounded text-white bg-white/10 border border-white/20 shadow-inner min-h-[44px] flex items-center overflow-hidden text-ellipsis whitespace-nowrap">
           {value || "-"}
        </div>
      )}
    </div>
  );
};

export default FieldGroup;