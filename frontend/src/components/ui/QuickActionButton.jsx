import { useState } from 'react';
import PropTypes from 'prop-types';

const QuickActionButton = ({ icon: Icon, label, onClick, iconColor, iconBgColor }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-[#404040] transition-all bg-white dark:bg-[#2A2A2A] hover:shadow-sm"
      style={isHovered ? {
        borderColor: iconColor,
        background: iconBgColor,
      } : {}}
    >
      <div
        className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-opacity"
        style={{
          background: iconBgColor,
          opacity: isHovered ? 1 : 0.9
        }}
      >
        <Icon size={17} style={{ color: iconColor }} />
      </div>
      <span className="text-[11px] font-semibold text-text-secondary text-center leading-tight">
        {label}
      </span>
    </button>
  );
};

QuickActionButton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  iconColor: PropTypes.string.isRequired,
  iconBgColor: PropTypes.string.isRequired,
};

export default QuickActionButton;
