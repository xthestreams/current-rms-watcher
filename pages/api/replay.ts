// API Route: /api/replay
// Event replay capability - reprocess events from stored raw payloads

import { NextApiRequest, NextApiResponse } from 'next';
import { eventStore } from '@/lib/eventStorePostgres';
import { rulesEngine } from '@/lib/businessRules';
import { ProcessedEvent } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId required' });
    }

    // Retrieve the event with its raw payload
    const eventData = await eventStore.getEventWithRawPayload(eventId);

    if (!eventData) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const { event: originalEvent, rawPayload } = eventData;

    if (!rawPayload) {
      return res.status(400).json({ error: 'No raw payload available for this event' });
    }

    // Create a new processed event from the raw payload
    const action = rawPayload.action;
    const opportunity = action?.subject;
    const member = action?.member;

    const replayEvent: ProcessedEvent = {
      id: `replay_${originalEvent.id}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      opportunityId: action?.subject_id || originalEvent.opportunityId,
      opportunityName: action?.name || opportunity?.name || originalEvent.opportunityName,
      customerName: opportunity?.organisation_name || originalEvent.customerName,
      userId: action?.member_id || originalEvent.userId,
      userName: member?.name || originalEvent.userName,
      actionType: action?.action_type || originalEvent.actionType,
      previousStatus: undefined,
      newStatus: opportunity?.opportunity_status || originalEvent.newStatus,
      processed: false
    };

    console.log('🔄 Replaying event:', {
      original: originalEvent.id,
      replay: replayEvent.id,
      opportunityId: replayEvent.opportunityId
    });

    // Execute business rules
    try {
      await rulesEngine.executeRules(replayEvent);
      replayEvent.processed = true;
      console.log('✅ Event replayed successfully:', replayEvent.id);
    } catch (error) {
      replayEvent.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error replaying event:', error);
    }

    // Store the replayed event
    await eventStore.addEvent(replayEvent, rawPayload);

    // Log the replay action in audit trail
    await eventStore.logAudit({
      entityType: 'event',
      entityId: originalEvent.id,
      action: 'replay',
      changes: {
        replayEventId: replayEvent.id,
        processed: replayEvent.processed,
        error: replayEvent.error
      }
    });

    return res.status(200).json({
      success: true,
      originalEventId: originalEvent.id,
      replayEventId: replayEvent.id,
      processed: replayEvent.processed,
      error: replayEvent.error,
      message: 'Event replayed successfully'
    });

  } catch (error) {
    console.error('Error replaying event:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
