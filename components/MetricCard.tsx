
import React from 'react';
import { AIStatus } from '../types';

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  status?: AIStatus;
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, status, icon }) => {
  const getBadgeColor = (color: AIStatus['color']) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-700 border-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'red': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-transform active:scale-[0.98]">
      <div className="flex justify-between items-start mb-3">
        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
          {icon}
        </div>
        {status && (
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getBadgeColor(status.color)}`}>
            {status.label}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{title}</h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-bold text-gray-800">{value}</span>
          <span className="text-gray-400 text-sm">{unit}</span>
        </div>
        {status && (
          <p className="text-xs text-gray-500 mt-2 leading-relaxed italic">
            {status.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
