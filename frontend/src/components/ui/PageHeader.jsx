import PropTypes from 'prop-types';

const PageHeader = ({ title, subtitle, action }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  action: PropTypes.node,
};

export default PageHeader;
