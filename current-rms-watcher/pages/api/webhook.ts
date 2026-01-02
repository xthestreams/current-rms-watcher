// API Route: /api/webhook
// Receives webhook POST requests from Current RMS

import { NextApiRequest, NextApiResponse } from 'next';
import { WebhookPayload, ProcessedEvent } from '@/types';
import { eventStore } from '@/lib/eventStore';
import { rulesEngine } from '@/lib/businessRules';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload: WebhookPayload = req.body;

    // Validate payload
    if (!payload.action || !payload.action.subject_id) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Extract relevant information
    const action = payload.action;
    const opportunity = action.subject;
    const member = action.member;

    // Create processed event
    const processedEvent: ProcessedEvent = {
      id: `evt_${action.id}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      opportunityId: action.subject_id,
      opportunityName: action.name || opportunity?.name || 'Unknown',
      customerName: opportunity?.organisation_name || 'Unknown Customer',
      userId: action.member_id,
      userName: member?.name || `User ${action.member_id}`,
      actionType: action.action_type,
      previousStatus: undefined, // Would need to track state to determine this
      newStatus: opportunity?.opportunity_status,
      processed: false
    };

    // Log the event
    console.log('📥 Webhook received:', {
      id: processedEvent.id,
      opportunityId: processedEvent.opportunityId,
      actionType: processedEvent.actionType,
      timestamp: processedEvent.timestamp
    });

    // Store the event
    eventStore.addEvent(processedEvent);

    // Execute business rules
    try {
      await rulesEngine.executeRules(processedEvent);
      processedEvent.processed = true;
      console.log('✅ Event processed successfully:', processedEvent.id);
    } catch (error) {
      processedEvent.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error processing event:', error);
    }

    // Return 200 OK quickly (webhook best practice)
    return res.status(200).json({
      success: true,
      eventId: processedEvent.id,
      message: 'Webhook received and processed'
    });

  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
