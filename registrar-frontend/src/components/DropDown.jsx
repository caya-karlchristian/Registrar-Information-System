import React from 'react';
import PropTypes from 'prop-types';

const DropdownGroup = ({ label, name, value, onChange, options, required = false }) => (
  <div className="w-full group">
    <label className="block text-xs md:text-sm text-white mb-1.5 ]">
      {label}
      {required && <span className="text-red-500 ml-1" title="Required">*</span>}
    </label>

    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full p-2.5 rounded-lg text-gray-700 bg-white border-2 border-transparent 
                   shadow-sm transition-all duration-200
                   hover:border-gray-200
                   focus:outline-none focus:ring-2 focus:ring-[#FFC72C] focus:border-transparent
                   appearance-none cursor-pointer text-sm"
      >
        <option value="" disabled className="text-gray-400">
          Please Select
        </option>

        {options.map(option => (
          <option key={option} value={option} className="text-gray-800">
            {option}
          </option>
        ))}
      </select>
    </div>
  </div>
);

DropdownGroup.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  required: PropTypes.bool, 
};

export default DropdownGroup;