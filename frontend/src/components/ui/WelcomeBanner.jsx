import PropTypes from 'prop-types';

const ROLE_GRADIENTS = {
  patient: 'linear-gradient(135deg, #2D2580, #4C1D95)',
  doctor: 'linear-gradient(135deg, #134E35, #1B7A5E)',
  admin: 'linear-gradient(135deg, #7C2D12, #C2410C)',
};

const WelcomeBanner = ({ role, title, subtitle, action, children }) => {
  const gradient = ROLE_GRADIENTS[role] || ROLE_GRADIENTS.patient;

  return (
    <div
      className="rounded-[18px] p-7 mb-6 flex items-center justify-between overflow-hidden relative"
      style={{ background: gradient }}
    >
      <div
        className="absolute right-[-30px] top-[-40px] w-60 h-60 rounded-full opacity-10 blur-[50px]"
        style={{ background: 'rgba(255,255,255,0.3)' }}
      />
      <div className="relative z-10">
        {subtitle && (
          <div className="text-xs text-white/50 mb-1">{subtitle}</div>
        )}
        <div className="text-2xl font-extrabold text-white tracking-tight mb-1">
          {title}
        </div>
        {children}
      </div>
      {action && (
        <div className="relative z-10 flex-shrink-0 ml-4">
          {action}
        </div>
      )}
    </div>
  );
};

WelcomeBanner.propTypes = {
  role: PropTypes.oneOf(['patient', 'doctor', 'admin']).isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  action: PropTypes.node,
  children: PropTypes.node,
};

export default WelcomeBanner;
