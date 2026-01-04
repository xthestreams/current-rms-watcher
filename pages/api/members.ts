// API Route: /api/members
// Fetch members from CurrentRMS

import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentRMSClient } from '@/lib/currentRmsClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if CurrentRMS is configured
    if (!process.env.CURRENT_RMS_SUBDOMAIN || !process.env.CURRENT_RMS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'CurrentRMS not configured'
      });
    }

    const client = getCurrentRMSClient();

    // Get membership_type filter from query params (default to 'User')
    const membershipType = req.query.type as string || 'User';

    // Fetch members with the specified type
    const members = await client.getAllMembers(membershipType);

    // Map to a simpler structure for the UI
    const simplifiedMembers = members.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email || '',
      membershipType: member.membership_type,
      active: member.active !== false
    }));

    return res.status(200).json({
      success: true,
      members: simplifiedMembers,
      count: simplifiedMembers.length
    });

  } catch (error) {
    console.error('[API] Error fetching members:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch members',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
