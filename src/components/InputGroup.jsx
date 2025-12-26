import React from "react";
import PropTypes from "prop-types";

const InputGroup = ({ label, name, value, onChange, type = "text", placeholder = "" }) => {
  return (
    <div className="w-full">
      <label className="block text-xs md:text-sm mb-1">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full p-2 rounded text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-[#FFC72C]"
      />
    </div>
  );
};

// Prop validation
InputGroup.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  placeholder: PropTypes.string,
};

export default InputGroup;
