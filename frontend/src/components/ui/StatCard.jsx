import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass, loading }) => {
  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-8 w-16 bg-gray-300 rounded"></div>
          </div>
          <div className="h-12 w-12 bg-gray-100 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClass || 'bg-primary-50 text-primary-600'}`}>
          {Icon && <Icon className="h-6 w-6" />}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
