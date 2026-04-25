import Button from './Button';

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    {Icon && (
      <div className="w-14 h-14 rounded-full bg-surface-subtle flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-text-muted" />
      </div>
    )}
    <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
    {description && (
      <p className="text-sm text-text-secondary max-w-xs mb-5">{description}</p>
    )}
    {action && (
      <Button onClick={action.onClick} size="md">
        {action.label}
      </Button>
    )}
  </div>
);

export default EmptyState;
