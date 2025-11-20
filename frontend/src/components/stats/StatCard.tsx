import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}

export default function StatCard({ icon: Icon, label, value, subValue, className = '' }: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br from-zinc-900 to-black border border-yellow-500/20 rounded-xl p-6 hover:border-yellow-500/50 transition-all ${className}`}>
      {Icon && (
        <Icon className="w-6 h-6 text-yellow-500 mb-3" />
      )}
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {subValue && (
        <p className="text-xs text-gray-500">{subValue}</p>
      )}
    </div>
  );
}

