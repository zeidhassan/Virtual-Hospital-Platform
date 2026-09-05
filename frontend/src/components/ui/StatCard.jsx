import PropTypes from 'prop-types';

const StatCard = ({ label, value, sub, icon: Icon, iconBg, delta, up, delay = 0 }) => {
  return (
    <div
      className="bg-surface border border-slate-200 rounded-card shadow-card p-6 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-text-secondary">{label}</span>
        {Icon && (
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center"
            style={{ background: iconBg || '#F0EEFF' }}
          >
            <Icon size={16} className="text-white" />
          </div>
        )}
      </div>
      <div className="text-[32px] font-extrabold text-text-primary tracking-tight leading-none">
        {value}
      </div>
      {(sub || delta) && (
        <div className="flex items-center gap-2 mt-2">
          {delta && (
            <span className={`text-xs font-semibold ${up ? 'text-status-success' : 'text-status-error'}`}>
              {up ? '↑' : '↓'} {delta}
            </span>
          )}
          {sub && <span className="text-xs text-text-muted">{sub}</span>}
        </div>
      )}
    </div>
  );
};

StatCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  sub: PropTypes.string,
  icon: PropTypes.elementType,
  iconBg: PropTypes.string,
  delta: PropTypes.string,
  up: PropTypes.bool,
  delay: PropTypes.number,
};

export default StatCard;
