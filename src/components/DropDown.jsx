import React from 'react';
import PropTypes from 'prop-types';

const DropdownGroup = ({ label, name, value, onChange, options }) => (
  <div className="w-full">
    <label className="block text-xs md:text-sm text-white mb-1">
      {label}
    </label>

    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full p-2 rounded text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#FFC72C]"
    >
      <option value="">Please Select</option>

      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

DropdownGroup.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default DropdownGroup;
