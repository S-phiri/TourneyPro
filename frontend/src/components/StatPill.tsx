import React from 'react';

interface StatPillProps {
  label: string;
  value: string | number;
  className?: string;
}

const StatPill: React.FC<StatPillProps> = ({ label, value, className = '' }) => {
  return (
    <div className={`stat-pill ${className}`}>
      <span className="font-semibold">{value}</span>
      <span className="ml-1 text-yellow-700">{label}</span>
    </div>
  );
};

export default StatPill;
