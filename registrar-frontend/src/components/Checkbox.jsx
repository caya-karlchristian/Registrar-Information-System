import React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../context/ThemeContext';

const CheckboxItem = ({ text, name, checked, onChange }) => {
  const { isDark } = useTheme();

  return (
    <div className="flex items-start space-x-3">
      <input 
        type="checkbox" 
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 w-5 h-5 accent-[#FFC72C] cursor-pointer shrink-0"
      />
      <p className={isDark ? 'text-[#e4e6eb]' : 'text-white'}>{text}</p>
    </div>
  );
};

CheckboxItem.propTypes = {
  text: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,  
  onChange: PropTypes.func.isRequired,
};

export default CheckboxItem;