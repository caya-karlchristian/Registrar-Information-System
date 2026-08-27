import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../context/ThemeContext';

const CheckboxItem = ({ text, name, checked, onChange, id }) => {
  const { isDark } = useTheme();
  const inputId = id || name;

  return (
    <label
      htmlFor={inputId}
      className="flex items-start space-x-3 cursor-pointer select-none group"
    >
      <input
        id={inputId}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 w-5 h-5 accent-[#FFC72C] cursor-pointer shrink-0 rounded transition-transform duration-150 active:scale-90"
      />
      <span
        className={`leading-relaxed transition-colors duration-150 group-hover:opacity-90 ${
          isDark ? 'text-[#e4e6eb]' : 'text-white'
        }`}
      >
        {text}
      </span>
    </label>
  );
};

CheckboxItem.propTypes = {
  text: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  id: PropTypes.string,
};

export default CheckboxItem;