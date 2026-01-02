// API Route: /api/events
// Retrieve recent events for the dashboard

import { NextApiRequest, NextApiResponse } from 'next';
import { eventStore } from '@/lib/eventStore';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const events = eventStore.getRecentEvents(limit);

    return res.status(200).json({
      success: true,
      events,
      count: events.length
    });
  } catch (error) {
    console.error('Error retrieving events:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
