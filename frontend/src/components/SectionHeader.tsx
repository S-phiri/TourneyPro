import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, className = '' }) => {
  return (
    <div className={`text-center mb-8 ${className}`}>
      <h2 className="section-title">{title}</h2>
      {subtitle && (
        <p className="text-gray-600 max-w-2xl mx-auto mt-2">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
