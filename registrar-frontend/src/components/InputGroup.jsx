import React from "react";
import PropTypes from "prop-types";

const InputGroup = ({ 
  label, 
  name, 
  value, 
  onChange, 
  type = "text", 
  placeholder = "", 
  pattern,
  title,
  required = false,
  min ,
  labelColor = 'text-white'
}) => {
  return (
    <div className="w-full">
      <label className={`block text-sm ${labelColor} mb-1.5`}>
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        pattern={pattern}
        title={title}
        min={min} 
        className="w-full px-3 py-3 bg-white rounded-lg text-sm text-gray-700 shadow-sm
                   placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[#FFC72C]
                   transition-all duration-200"
      />
    </div>
  );
};

InputGroup.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
  pattern: PropTypes.string,
  title: PropTypes.string,
  labelColor: PropTypes.string,
  min: PropTypes.string,
};

export default InputGroup;