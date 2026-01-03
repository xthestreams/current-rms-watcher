import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface TimelineChartProps {
  data: { date: string; count: number }[];
}

export function TimelineChart({ data }: TimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Activity Timeline (Last 7 Days)</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Format dates for display
  const formattedData = data.map(item => ({
    ...item,
    displayDate: format(new Date(item.date), 'MMM dd')
  })).reverse(); // Reverse to show oldest to newest

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Activity Timeline (Last 7 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="displayDate" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} name="Events" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
