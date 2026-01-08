import React from "react";
import PropTypes from "prop-types";

const InputGroup = ({ 
  label, 
  name, 
  value, 
  onChange, 
  type = "text", 
  placeholder = "", 
  required = false // 1. Add default value for required prop
}) => {
  return (
    <div className="w-full">
      <label className="block text-xs md:text-sm mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required} 
        className="w-full p-2 rounded text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFC72C]"
      />
    </div>
  );
};

// Prop validation
InputGroup.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool, 
};

export default InputGroup;