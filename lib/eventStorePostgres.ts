// Event store with Vercel Postgres persistence
// Provides reliable cross-instance storage

import { ProcessedEvent, HealthMetrics } from '@/types';
import { sql } from '@vercel/postgres';

class EventStorePostgres {
  private startTime: number = Date.now();
  private initialized: boolean = false;

  // Initialize database schema
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create events table if it doesn't exist
      await sql`
        CREATE TABLE IF NOT EXISTS webhook_events (
          id TEXT PRIMARY KEY,
          timestamp TIMESTAMP NOT NULL,
          opportunity_id INTEGER NOT NULL,
          opportunity_name TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          user_name TEXT NOT NULL,
          action_type TEXT NOT NULL,
          previous_status TEXT,
          new_status TEXT,
          processed BOOLEAN NOT NULL DEFAULT false,
          error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create index for faster queries
      await sql`
        CREATE INDEX IF NOT EXISTS idx_webhook_events_timestamp
        ON webhook_events(timestamp DESC)
      `;

      // Create metadata table for uptime tracking
      await sql`
        CREATE TABLE IF NOT EXISTS webhook_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Initialize start time if not exists
      const result = await sql`
        SELECT value FROM webhook_metadata WHERE key = 'start_time'
      `;

      if (result.rows.length === 0) {
        await sql`
          INSERT INTO webhook_metadata (key, value)
          VALUES ('start_time', ${Date.now().toString()})
        `;
        this.startTime = Date.now();
      } else {
        this.startTime = parseInt(result.rows[0].value);
      }

      this.initialized = true;
      console.log('[EventStore] Postgres initialized successfully');
    } catch (error) {
      console.error('[EventStore] Error initializing database:', error);
      throw error;
    }
  }

  async addEvent(event: ProcessedEvent): Promise<void> {
    await this.initialize();

    try {
      await sql`
        INSERT INTO webhook_events (
          id, timestamp, opportunity_id, opportunity_name, customer_name,
          user_id, user_name, action_type, previous_status, new_status,
          processed, error
        ) VALUES (
          ${event.id},
          ${event.timestamp},
          ${event.opportunityId},
          ${event.opportunityName},
          ${event.customerName},
          ${event.userId},
          ${event.userName},
          ${event.actionType},
          ${event.previousStatus || null},
          ${event.newStatus || null},
          ${event.processed},
          ${event.error || null}
        )
      `;
      console.log(`[EventStore] Event ${event.id} saved to database`);
    } catch (error) {
      console.error('[EventStore] Error saving event:', error);
      throw error;
    }
  }

  async getRecentEvents(limit: number = 50): Promise<ProcessedEvent[]> {
    await this.initialize();

    try {
      const result = await sql`
        SELECT
          id, timestamp, opportunity_id, opportunity_name, customer_name,
          user_id, user_name, action_type, previous_status, new_status,
          processed, error
        FROM webhook_events
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      return result.rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        opportunityId: row.opportunity_id,
        opportunityName: row.opportunity_name,
        customerName: row.customer_name,
        userId: row.user_id,
        userName: row.user_name,
        actionType: row.action_type,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        processed: row.processed,
        error: row.error
      }));
    } catch (error) {
      console.error('[EventStore] Error fetching events:', error);
      return [];
    }
  }

  async getEventById(id: string): Promise<ProcessedEvent | undefined> {
    await this.initialize();

    try {
      const result = await sql`
        SELECT
          id, timestamp, opportunity_id, opportunity_name, customer_name,
          user_id, user_name, action_type, previous_status, new_status,
          processed, error
        FROM webhook_events
        WHERE id = ${id}
      `;

      if (result.rows.length === 0) return undefined;

      const row = result.rows[0];
      return {
        id: row.id,
        timestamp: row.timestamp,
        opportunityId: row.opportunity_id,
        opportunityName: row.opportunity_name,
        customerName: row.customer_name,
        userId: row.user_id,
        userName: row.user_name,
        actionType: row.action_type,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        processed: row.processed,
        error: row.error
      };
    } catch (error) {
      console.error('[EventStore] Error fetching event by ID:', error);
      return undefined;
    }
  }

  async getMetrics(): Promise<HealthMetrics> {
    await this.initialize();

    try {
      const [totalResult, successResult, failedResult, lastEventResult] = await Promise.all([
        sql`SELECT COUNT(*) as count FROM webhook_events`,
        sql`SELECT COUNT(*) as count FROM webhook_events WHERE processed = true AND error IS NULL`,
        sql`SELECT COUNT(*) as count FROM webhook_events WHERE error IS NOT NULL`,
        sql`SELECT timestamp FROM webhook_events ORDER BY timestamp DESC LIMIT 1`
      ]);

      const totalEvents = parseInt(totalResult.rows[0].count);
      const successfulEvents = parseInt(successResult.rows[0].count);
      const failedEvents = parseInt(failedResult.rows[0].count);
      const lastEventTime = lastEventResult.rows.length > 0
        ? lastEventResult.rows[0].timestamp
        : undefined;
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);

      return {
        totalEvents,
        successfulEvents,
        failedEvents,
        lastEventTime,
        uptime
      };
    } catch (error) {
      console.error('[EventStore] Error fetching metrics:', error);
      return {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        lastEventTime: undefined,
        uptime: 0
      };
    }
  }

  async getEventsByOpportunity(opportunityId: number): Promise<ProcessedEvent[]> {
    await this.initialize();

    try {
      const result = await sql`
        SELECT
          id, timestamp, opportunity_id, opportunity_name, customer_name,
          user_id, user_name, action_type, previous_status, new_status,
          processed, error
        FROM webhook_events
        WHERE opportunity_id = ${opportunityId}
        ORDER BY timestamp DESC
      `;

      return result.rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        opportunityId: row.opportunity_id,
        opportunityName: row.opportunity_name,
        customerName: row.customer_name,
        userId: row.user_id,
        userName: row.user_name,
        actionType: row.action_type,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        processed: row.processed,
        error: row.error
      }));
    } catch (error) {
      console.error('[EventStore] Error fetching events by opportunity:', error);
      return [];
    }
  }

  async clearEvents(): Promise<void> {
    await this.initialize();

    try {
      await sql`DELETE FROM webhook_events`;
      console.log('[EventStore] All events cleared from database');
    } catch (error) {
      console.error('[EventStore] Error clearing events:', error);
      throw error;
    }
  }
}

// Singleton instance
export const eventStore = new EventStorePostgres();
