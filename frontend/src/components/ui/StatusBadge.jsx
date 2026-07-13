import React from 'react';

const StatusBadge = ({ status }) => {
  const getStyles = () => {
    switch (status?.toLowerCase()) {
      case 'normal':
        return 'bg-green-100 text-green-700 border-green-500';
      case 'borderline':
      case 'high':
      case 'low':
        return 'bg-yellow-100 text-yellow-700 border-yellow-500';
      case 'abnormal':
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-500';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getIcon = () => {
    switch (status?.toLowerCase()) {
      case 'normal': return '✅';
      case 'borderline':
      case 'high':
      case 'low': return '⚠️';
      case 'abnormal':
      case 'critical': return '🔴';
      default: return 'ℹ️';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyles()}`}>
      <span className="mr-1">{getIcon()}</span>
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
