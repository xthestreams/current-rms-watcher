import React from 'react';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  timestamp: string;
  opportunityId: number;
  opportunityName: string;
  customerName: string;
  userName: string;
  actionType: string;
  newStatus?: string;
  processed: boolean;
  error?: string;
}

interface ActivityFeedProps {
  data: Activity[];
}

export function ActivityFeed({ data }: ActivityFeedProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="text-gray-400 text-center py-8">
          No recent activity
        </div>
      </div>
    );
  }

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('create')) return '✨';
    if (actionType.includes('update')) return '📝';
    if (actionType.includes('delete')) return '🗑️';
    if (actionType.includes('status')) return '🔄';
    return '📌';
  };

  const getStatusBadge = (activity: Activity) => {
    if (activity.error) {
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Error</span>;
    }
    if (activity.processed) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Processed</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {data.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 p-3 rounded hover:bg-gray-50">
            <div className="text-2xl">{getActionIcon(activity.actionType)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.opportunityName}
                </p>
                {getStatusBadge(activity)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {activity.customerName}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium">{activity.userName}</span> • {activity.actionType}
                {activity.newStatus && <span> → {activity.newStatus}</span>}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
              {activity.error && (
                <p className="text-xs text-red-600 mt-1 font-mono">
                  {activity.error}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
