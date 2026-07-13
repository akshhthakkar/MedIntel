import React from 'react';

const SkeletonCard = ({ className = "" }) => {
  return (
    <div className={`card p-6 animate-pulse ${className}`}>
      <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-100 rounded"></div>
        <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
        <div className="h-4 w-4/6 bg-gray-100 rounded"></div>
      </div>
    </div>
  );
};

export default SkeletonCard;
