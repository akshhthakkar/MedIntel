import React from 'react';

const EmptyState = ({ icon, title, message, actionLabel, onAction }) => {
  const isStringIcon = typeof icon === 'string';
  const Icon = !isStringIcon ? icon : null;

  return (
    <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed border-gray-300">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-50 mb-4">
        {icon && (
          isStringIcon 
            ? <span className="text-5xl block">{icon}</span>
            : <Icon className="h-8 w-8 text-gray-400" />
        )}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
        {message}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary">
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
