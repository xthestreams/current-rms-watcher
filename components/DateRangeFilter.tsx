import { useState } from 'react';

export type DateRangePreset = '0-30' | '30-60' | '60-90' | '12-months' | 'custom' | 'all';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string | null;
  endDate: string | null;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(value.preset === 'custom');

  const handlePresetChange = (preset: DateRangePreset) => {
    const today = new Date();
    let startDate: string | null = null;
    let endDate: string | null = null;

    switch (preset) {
      case '0-30':
        startDate = today.toISOString().split('T')[0];
        endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30-60':
        startDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '60-90':
        startDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        endDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '12-months':
        startDate = today.toISOString().split('T')[0];
        endDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'custom':
        setShowCustom(true);
        startDate = value.startDate;
        endDate = value.endDate;
        break;
      case 'all':
        startDate = null;
        endDate = null;
        break;
    }

    onChange({ preset, startDate, endDate });
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', dateValue: string) => {
    onChange({
      preset: 'custom',
      startDate: field === 'startDate' ? dateValue : value.startDate,
      endDate: field === 'endDate' ? dateValue : value.endDate
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Filter by Event Date
      </label>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={() => handlePresetChange('all')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value.preset === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Dates
        </button>
        <button
          onClick={() => handlePresetChange('0-30')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value.preset === '0-30'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          0-30 Days
        </button>
        <button
          onClick={() => handlePresetChange('30-60')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value.preset === '30-60'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          30-60 Days
        </button>
        <button
          onClick={() => handlePresetChange('60-90')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value.preset === '60-90'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          60-90 Days
        </button>
        <button
          onClick={() => handlePresetChange('12-months')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value.preset === '12-months'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Next 12 Months
        </button>
        <button
          onClick={() => handlePresetChange('custom')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value.preset === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Custom Range
        </button>
      </div>

      {showCustom && value.preset === 'custom' && (
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={value.startDate || ''}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={value.endDate || ''}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
