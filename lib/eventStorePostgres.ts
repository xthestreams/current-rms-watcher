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

    // Check if database is configured
    if (!process.env.POSTGRES_URL) {
      console.warn('[EventStore] Postgres not configured - database features disabled');
      console.warn('[EventStore] Please create a Postgres database in Vercel dashboard');
      this.initialized = true;
      return;
    }

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
          raw_payload JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create index for faster queries
      await sql`
        CREATE INDEX IF NOT EXISTS idx_webhook_events_timestamp
        ON webhook_events(timestamp DESC)
      `;

      // Create index for opportunity lookups
      await sql`
        CREATE INDEX IF NOT EXISTS idx_webhook_events_opportunity_id
        ON webhook_events(opportunity_id)
      `;

      // Create metadata table for uptime tracking
      await sql`
        CREATE TABLE IF NOT EXISTS webhook_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create augmented opportunities table for business intelligence data
      await sql`
        CREATE TABLE IF NOT EXISTS augmented_opportunities (
          opportunity_id INTEGER PRIMARY KEY,
          workflow_status TEXT,
          risk_level TEXT,
          risk_notes TEXT,
          financial_health_score INTEGER,
          custom_calculations JSONB,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create audit log table for tracking all changes
      await sql`
        CREATE TABLE IF NOT EXISTS audit_log (
          id SERIAL PRIMARY KEY,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          action TEXT NOT NULL,
          changes JSONB,
          user_id INTEGER,
          user_name TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create index for audit log queries
      await sql`
        CREATE INDEX IF NOT EXISTS idx_audit_log_entity
        ON audit_log(entity_type, entity_id, timestamp DESC)
      `;

      // Create workflow instances table
      await sql`
        CREATE TABLE IF NOT EXISTS workflow_instances (
          id SERIAL PRIMARY KEY,
          opportunity_id INTEGER NOT NULL,
          workflow_type TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP,
          current_step TEXT,
          data JSONB,
          error TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create index for workflow queries
      await sql`
        CREATE INDEX IF NOT EXISTS idx_workflow_instances_opportunity
        ON workflow_instances(opportunity_id, status)
      `;

      // Create external integrations table
      await sql`
        CREATE TABLE IF NOT EXISTS external_integrations (
          id SERIAL PRIMARY KEY,
          opportunity_id INTEGER NOT NULL,
          system_name TEXT NOT NULL,
          external_id TEXT NOT NULL,
          uid TEXT,
          sync_status TEXT,
          last_synced TIMESTAMP,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(opportunity_id, system_name)
        )
      `;

      // Create index for integration lookups
      await sql`
        CREATE INDEX IF NOT EXISTS idx_external_integrations_uid
        ON external_integrations(uid)
      `;

      // Create index for integration sync status
      await sql`
        CREATE INDEX IF NOT EXISTS idx_external_integrations_sync
        ON external_integrations(system_name, sync_status)
      `;

      // Create opportunities table for full Current RMS data
      await sql`
        CREATE TABLE IF NOT EXISTS opportunities (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          subject TEXT,
          description TEXT,
          starts_at TIMESTAMP,
          ends_at TIMESTAMP,
          opportunity_status TEXT,
          created_at_rms TIMESTAMP,
          updated_at_rms TIMESTAMP,
          venue_name TEXT,
          organisation_id INTEGER,
          organisation_name TEXT,
          owner_id INTEGER,
          owner_name TEXT,
          charge_total DECIMAL(10,2),
          total_value DECIMAL(10,2),
          data JSONB,
          synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_webhook_at TIMESTAMP
        )
      `;

      // Create indexes for opportunity queries
      await sql`
        CREATE INDEX IF NOT EXISTS idx_opportunities_status
        ON opportunities(opportunity_status)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_opportunities_dates
        ON opportunities(starts_at, ends_at)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_opportunities_org
        ON opportunities(organisation_id)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_opportunities_updated
        ON opportunities(updated_at_rms DESC)
      `;

      // Create sync metadata table
      await sql`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id SERIAL PRIMARY KEY,
          sync_type TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP,
          records_synced INTEGER DEFAULT 0,
          records_failed INTEGER DEFAULT 0,
          error TEXT,
          metadata JSONB
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_sync_metadata_type
        ON sync_metadata(sync_type, started_at DESC)
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

  async addEvent(event: ProcessedEvent, rawPayload?: any): Promise<void> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      console.warn('[EventStore] Skipping event save - database not configured');
      return;
    }

    try {
      await sql`
        INSERT INTO webhook_events (
          id, timestamp, opportunity_id, opportunity_name, customer_name,
          user_id, user_name, action_type, previous_status, new_status,
          processed, error, raw_payload
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
          ${event.error || null},
          ${rawPayload ? JSON.stringify(rawPayload) : null}
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

    if (!process.env.POSTGRES_URL) {
      return [];
    }

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

    if (!process.env.POSTGRES_URL) {
      return undefined;
    }

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

    if (!process.env.POSTGRES_URL) {
      return {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        lastEventTime: undefined,
        uptime: Math.floor((Date.now() - this.startTime) / 1000)
      };
    }

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

  async getRiskSummary(startDate?: string, endDate?: string): Promise<Array<{ level: string | null; count: number; totalValue: number }>> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      // Calculate risk level from risk_score using the same logic as the risk assessment app
      // Risk levels: LOW (≤2.0), MEDIUM (≤3.0), HIGH (≤4.0), CRITICAL (>4.0)

      console.log('[EventStore] getRiskSummary called with:', { startDate, endDate });

      // First, check how many opportunities exist in total
      const totalCount = await sql`SELECT COUNT(*) as count FROM opportunities`;
      console.log('[EventStore] Total opportunities in database:', totalCount.rows[0].count);

      // Check how many have risk scores
      const scoredCount = await sql`
        SELECT COUNT(*) as count
        FROM opportunities
        WHERE COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) > 0
      `;
      console.log('[EventStore] Opportunities with risk scores:', scoredCount.rows[0].count);

      let result;

      // Build query based on date filtering parameters
      if (startDate && endDate) {
        result = await sql`
          SELECT
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN NULL
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 'LOW'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 'MEDIUM'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 'HIGH'
              ELSE 'CRITICAL'
            END as level,
            COUNT(*)::int as count,
            COALESCE(SUM(CAST(charge_total AS DECIMAL)), 0) as total_value
          FROM opportunities
          WHERE starts_at >= ${startDate}::date AND starts_at <= ${endDate}::date
          GROUP BY
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN NULL
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 'LOW'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 'MEDIUM'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 'HIGH'
              ELSE 'CRITICAL'
            END
          ORDER BY
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN 5
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 4
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 3
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 2
              ELSE 1
            END
        `;
      } else if (startDate) {
        result = await sql`
          SELECT
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN NULL
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 'LOW'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 'MEDIUM'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 'HIGH'
              ELSE 'CRITICAL'
            END as level,
            COUNT(*)::int as count,
            COALESCE(SUM(CAST(charge_total AS DECIMAL)), 0) as total_value
          FROM opportunities
          WHERE starts_at >= ${startDate}::date
          GROUP BY
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN NULL
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 'LOW'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 'MEDIUM'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 'HIGH'
              ELSE 'CRITICAL'
            END
          ORDER BY
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN 5
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 4
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 3
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 2
              ELSE 1
            END
        `;
      } else if (endDate) {
        result = await sql`
          SELECT
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN NULL
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 'LOW'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 'MEDIUM'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 'HIGH'
              ELSE 'CRITICAL'
            END as level,
            COUNT(*)::int as count,
            COALESCE(SUM(CAST(charge_total AS DECIMAL)), 0) as total_value
          FROM opportunities
          WHERE starts_at <= ${endDate}::date
          GROUP BY
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN NULL
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 'LOW'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 'MEDIUM'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 'HIGH'
              ELSE 'CRITICAL'
            END
          ORDER BY
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN 5
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 4
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 3
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 2
              ELSE 1
            END
        `;
      } else {
        // No date filtering
        result = await sql`
          SELECT
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN NULL
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 'LOW'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 'MEDIUM'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 'HIGH'
              ELSE 'CRITICAL'
            END as level,
            COUNT(*)::int as count,
            COALESCE(SUM(CAST(charge_total AS DECIMAL)), 0) as total_value
          FROM opportunities
          GROUP BY
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN NULL
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 'LOW'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 'MEDIUM'
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 'HIGH'
              ELSE 'CRITICAL'
            END
          ORDER BY
            CASE
              WHEN COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0 THEN 5
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0 THEN 4
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0 THEN 3
              WHEN CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0 THEN 2
              ELSE 1
            END
        `;
      }

      const mapped = result.rows.map(row => ({
        level: row.level,
        count: row.count,
        totalValue: parseFloat(row.total_value) || 0
      }));

      console.log('[EventStore] getRiskSummary returning:', mapped);

      return mapped;
    } catch (error) {
      console.error('[EventStore] Error fetching risk summary:', error);
      return [];
    }
  }

  async getOpportunitiesByRiskLevel(riskLevel: string | null, limit: number = 100): Promise<any[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      let result;

      if (riskLevel === null) {
        // Unscored opportunities (risk_score is 0 or NULL)
        result = await sql`
          SELECT
            id, name, subject, organisation_name, owner_name,
            starts_at, charge_total, data
          FROM opportunities
          WHERE COALESCE(CAST(data->'custom_fields'->>'risk_score' AS DECIMAL), 0) = 0
          ORDER BY starts_at ASC
          LIMIT ${limit}
        `;
      } else {
        // Calculate risk level from risk_score and filter
        // Risk levels: LOW (≤2.0), MEDIUM (≤3.0), HIGH (≤4.0), CRITICAL (>4.0)
        if (riskLevel === 'LOW') {
          result = await sql`
            SELECT
              id, name, subject, organisation_name, owner_name,
              starts_at, charge_total, data
            FROM opportunities
            WHERE CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) > 0
              AND CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 2.0
            ORDER BY CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) DESC, starts_at ASC
            LIMIT ${limit}
          `;
        } else if (riskLevel === 'MEDIUM') {
          result = await sql`
            SELECT
              id, name, subject, organisation_name, owner_name,
              starts_at, charge_total, data
            FROM opportunities
            WHERE CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) > 2.0
              AND CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 3.0
            ORDER BY CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) DESC, starts_at ASC
            LIMIT ${limit}
          `;
        } else if (riskLevel === 'HIGH') {
          result = await sql`
            SELECT
              id, name, subject, organisation_name, owner_name,
              starts_at, charge_total, data
            FROM opportunities
            WHERE CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) > 3.0
              AND CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) <= 4.0
            ORDER BY CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) DESC, starts_at ASC
            LIMIT ${limit}
          `;
        } else if (riskLevel === 'CRITICAL') {
          result = await sql`
            SELECT
              id, name, subject, organisation_name, owner_name,
              starts_at, charge_total, data
            FROM opportunities
            WHERE CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) > 4.0
            ORDER BY CAST(data->'custom_fields'->>'risk_score' AS DECIMAL) DESC, starts_at ASC
            LIMIT ${limit}
          `;
        } else {
          // Invalid risk level
          return [];
        }
      }

      return result.rows;
    } catch (error) {
      console.error('[EventStore] Error fetching opportunities by risk level:', error);
      return [];
    }
  }

  async getEventsByOpportunity(opportunityId: number): Promise<ProcessedEvent[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

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

    if (!process.env.POSTGRES_URL) {
      console.warn('[EventStore] Skipping clear - database not configured');
      return;
    }

    try {
      await sql`DELETE FROM webhook_events`;
      console.log('[EventStore] All events cleared from database');
    } catch (error) {
      console.error('[EventStore] Error clearing events:', error);
      throw error;
    }
  }

  // Event replay capability - retrieve raw payload for reprocessing
  async getEventWithRawPayload(id: string): Promise<{ event: ProcessedEvent; rawPayload: any } | undefined> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return undefined;
    }

    try {
      const result = await sql`
        SELECT
          id, timestamp, opportunity_id, opportunity_name, customer_name,
          user_id, user_name, action_type, previous_status, new_status,
          processed, error, raw_payload
        FROM webhook_events
        WHERE id = ${id}
      `;

      if (result.rows.length === 0) return undefined;

      const row = result.rows[0];
      return {
        event: {
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
        },
        rawPayload: row.raw_payload
      };
    } catch (error) {
      console.error('[EventStore] Error fetching event with raw payload:', error);
      return undefined;
    }
  }

  // Audit logging
  async logAudit(params: {
    entityType: string;
    entityId: string;
    action: string;
    changes?: any;
    userId?: number;
    userName?: string;
  }): Promise<void> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return;
    }

    try {
      await sql`
        INSERT INTO audit_log (entity_type, entity_id, action, changes, user_id, user_name)
        VALUES (
          ${params.entityType},
          ${params.entityId},
          ${params.action},
          ${params.changes ? JSON.stringify(params.changes) : null},
          ${params.userId || null},
          ${params.userName || null}
        )
      `;
    } catch (error) {
      console.error('[EventStore] Error logging audit:', error);
      throw error;
    }
  }

  // Get audit trail for an entity
  async getAuditTrail(entityType: string, entityId: string): Promise<any[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = await sql`
        SELECT id, entity_type, entity_id, action, changes, user_id, user_name, timestamp
        FROM audit_log
        WHERE entity_type = ${entityType} AND entity_id = ${entityId}
        ORDER BY timestamp DESC
      `;

      return result.rows;
    } catch (error) {
      console.error('[EventStore] Error fetching audit trail:', error);
      return [];
    }
  }

  // Reconciliation query - find events without corresponding augmented data
  async getUnaugmentedOpportunities(): Promise<number[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = await sql`
        SELECT DISTINCT we.opportunity_id
        FROM webhook_events we
        LEFT JOIN augmented_opportunities ao ON we.opportunity_id = ao.opportunity_id
        WHERE ao.opportunity_id IS NULL
        ORDER BY we.opportunity_id
      `;

      return result.rows.map(row => row.opportunity_id);
    } catch (error) {
      console.error('[EventStore] Error finding unaugmented opportunities:', error);
      return [];
    }
  }

  // Reconciliation query - find opportunities missing external integrations
  async getOpportunitiesMissingIntegration(systemName: string): Promise<number[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = await sql`
        SELECT DISTINCT we.opportunity_id
        FROM webhook_events we
        LEFT JOIN external_integrations ei
          ON we.opportunity_id = ei.opportunity_id
          AND ei.system_name = ${systemName}
        WHERE ei.id IS NULL
        ORDER BY we.opportunity_id
      `;

      return result.rows.map(row => row.opportunity_id);
    } catch (error) {
      console.error('[EventStore] Error finding opportunities missing integration:', error);
      return [];
    }
  }

  // Reconciliation query - find stale/failed integrations
  async getStaleIntegrations(systemName?: string): Promise<any[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = systemName
        ? await sql`
            SELECT * FROM external_integrations
            WHERE system_name = ${systemName}
              AND (sync_status = 'failed' OR last_synced < NOW() - INTERVAL '24 hours')
            ORDER BY last_synced ASC
          `
        : await sql`
            SELECT * FROM external_integrations
            WHERE sync_status = 'failed' OR last_synced < NOW() - INTERVAL '24 hours'
            ORDER BY last_synced ASC
          `;

      return result.rows;
    } catch (error) {
      console.error('[EventStore] Error finding stale integrations:', error);
      return [];
    }
  }

  // Dashboard Metrics - Action type distribution
  async getActionTypeDistribution(): Promise<{ actionType: string; count: number }[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = await sql`
        SELECT action_type as "actionType", COUNT(*) as count
        FROM webhook_events
        GROUP BY action_type
        ORDER BY count DESC
      `;

      return result.rows.map(row => ({
        actionType: row.actionType,
        count: parseInt(row.count)
      }));
    } catch (error) {
      console.error('[EventStore] Error fetching action type distribution:', error);
      return [];
    }
  }

  // Dashboard Metrics - Status distribution from augmented data
  async getStatusDistribution(): Promise<{ status: string; count: number }[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = await sql`
        SELECT workflow_status as status, COUNT(*) as count
        FROM augmented_opportunities
        WHERE workflow_status IS NOT NULL
        GROUP BY workflow_status
        ORDER BY count DESC
      `;

      return result.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count)
      }));
    } catch (error) {
      console.error('[EventStore] Error fetching status distribution:', error);
      return [];
    }
  }

  // Dashboard Metrics - Events over time (last 7 days)
  async getEventsTimeline(days: number = 7): Promise<{ date: string; count: number }[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = await sql`
        SELECT
          DATE(timestamp) as date,
          COUNT(*) as count
        FROM webhook_events
        WHERE timestamp >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `;

      return result.rows.map(row => ({
        date: row.date,
        count: parseInt(row.count)
      }));
    } catch (error) {
      console.error('[EventStore] Error fetching events timeline:', error);
      return [];
    }
  }

  // Dashboard Metrics - Top opportunities by activity
  async getTopOpportunitiesByActivity(limit: number = 10): Promise<any[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = await sql`
        SELECT
          opportunity_id as "opportunityId",
          opportunity_name as "opportunityName",
          customer_name as "customerName",
          COUNT(*) as "eventCount",
          MAX(timestamp) as "lastActivity"
        FROM webhook_events
        GROUP BY opportunity_id, opportunity_name, customer_name
        ORDER BY "eventCount" DESC
        LIMIT ${limit}
      `;

      return result.rows.map(row => ({
        opportunityId: row.opportunityId,
        opportunityName: row.opportunityName,
        customerName: row.customerName,
        eventCount: parseInt(row.eventCount),
        lastActivity: row.lastActivity
      }));
    } catch (error) {
      console.error('[EventStore] Error fetching top opportunities:', error);
      return [];
    }
  }

  // Dashboard Metrics - Recent activity feed
  async getRecentActivity(limit: number = 20): Promise<any[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = await sql`
        SELECT
          id,
          timestamp,
          opportunity_id as "opportunityId",
          opportunity_name as "opportunityName",
          customer_name as "customerName",
          user_name as "userName",
          action_type as "actionType",
          new_status as "newStatus",
          processed,
          error
        FROM webhook_events
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      return result.rows;
    } catch (error) {
      console.error('[EventStore] Error fetching recent activity:', error);
      return [];
    }
  }

  // Dashboard Metrics - Comprehensive dashboard data
  async getDashboardMetrics(startDate?: string, endDate?: string): Promise<any> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return {
        overview: {
          totalEvents: 0,
          totalOpportunities: 0,
          successRate: 0,
          failedEvents: 0
        },
        actionTypeDistribution: [],
        statusDistribution: [],
        timeline: [],
        topOpportunities: [],
        recentActivity: []
      };
    }

    try {
      const [
        metrics,
        actionTypes,
        statuses,
        timeline,
        topOpps,
        recentActivity,
        lastSync
      ] = await Promise.all([
        this.getMetrics(),
        this.getActionTypeDistribution(),
        this.getOpportunityStatusDistribution(), // Use synced opportunities instead of augmented
        this.getEventsTimeline(7),
        this.getTopOpportunitiesByActivity(10),
        this.getRecentActivity(20),
        this.getLastCompletedSync()
      ]);

      // Calculate total opportunities from opportunities table (includes synced data)
      // Apply date filtering if provided
      let oppResult;
      if (startDate && endDate) {
        oppResult = await sql`
          SELECT COUNT(*) as count
          FROM opportunities
          WHERE starts_at >= ${startDate}::date AND starts_at <= ${endDate}::date
        `;
      } else if (startDate) {
        oppResult = await sql`
          SELECT COUNT(*) as count
          FROM opportunities
          WHERE starts_at >= ${startDate}::date
        `;
      } else if (endDate) {
        oppResult = await sql`
          SELECT COUNT(*) as count
          FROM opportunities
          WHERE starts_at <= ${endDate}::date
        `;
      } else {
        oppResult = await sql`
          SELECT COUNT(*) as count
          FROM opportunities
        `;
      }
      const totalOpportunities = parseInt(oppResult.rows[0].count);

      const successRate = metrics.totalEvents > 0
        ? Math.round((metrics.successfulEvents / metrics.totalEvents) * 100)
        : 0;

      return {
        overview: {
          totalEvents: metrics.totalEvents,
          totalOpportunities,
          successRate,
          failedEvents: metrics.failedEvents,
          uptime: metrics.uptime,
          lastEventTime: metrics.lastEventTime
        },
        actionTypeDistribution: actionTypes,
        statusDistribution: statuses,
        timeline,
        topOpportunities: topOpps,
        recentActivity,
        syncInfo: lastSync ? {
          lastSyncTime: lastSync.completedAt,
          recordsSynced: lastSync.recordsSynced,
          recordsFailed: lastSync.recordsFailed
        } : null
      };
    } catch (error) {
      console.error('[EventStore] Error fetching dashboard metrics:', error);
      return {
        overview: {
          totalEvents: 0,
          totalOpportunities: 0,
          successRate: 0,
          failedEvents: 0
        },
        actionTypeDistribution: [],
        statusDistribution: [],
        timeline: [],
        topOpportunities: [],
        recentActivity: []
      };
    }
  }

  // Get opportunity status distribution from synced opportunities
  async getOpportunityStatusDistribution(): Promise<{ status: string; count: number }[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = await sql`
        SELECT opportunity_status as status, COUNT(*) as count
        FROM opportunities
        WHERE opportunity_status IS NOT NULL
        GROUP BY opportunity_status
        ORDER BY count DESC
      `;

      return result.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count)
      }));
    } catch (error) {
      console.error('[EventStore] Error fetching opportunity status distribution:', error);
      return [];
    }
  }

  // Get opportunities by date range for timeline
  async getOpportunitiesByDateRange(days: number = 30): Promise<any[]> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return [];
    }

    try {
      const result = await sql`
        SELECT
          id,
          name,
          organisation_name,
          opportunity_status,
          starts_at,
          ends_at,
          charge_total,
          synced_at
        FROM opportunities
        WHERE starts_at >= CURRENT_DATE - INTERVAL '${days} days'
          OR ends_at >= CURRENT_DATE - INTERVAL '${days} days'
        ORDER BY starts_at DESC
        LIMIT 100
      `;

      return result.rows;
    } catch (error) {
      console.error('[EventStore] Error fetching opportunities by date range:', error);
      return [];
    }
  }

  // Get last sync timestamp from opportunities table
  async getLastSyncTimestamp(): Promise<Date | null> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return null;
    }

    try {
      const result = await sql`
        SELECT MAX(synced_at) as last_sync
        FROM opportunities
      `;

      if (result.rows.length > 0 && result.rows[0].last_sync) {
        return new Date(result.rows[0].last_sync);
      }

      return null;
    } catch (error) {
      console.error('[EventStore] Error fetching last sync timestamp:', error);
      return null;
    }
  }

  // Get last sync from sync_metadata table
  async getLastCompletedSync(syncType: string = 'opportunities'): Promise<{
    startedAt: Date;
    completedAt: Date;
    recordsSynced: number;
    recordsFailed: number;
  } | null> {
    await this.initialize();

    if (!process.env.POSTGRES_URL) {
      return null;
    }

    try {
      const result = await sql`
        SELECT
          started_at,
          completed_at,
          records_synced,
          records_failed
        FROM sync_metadata
        WHERE sync_type = ${syncType}
          AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1
      `;

      if (result.rows.length > 0) {
        return {
          startedAt: new Date(result.rows[0].started_at),
          completedAt: new Date(result.rows[0].completed_at),
          recordsSynced: result.rows[0].records_synced,
          recordsFailed: result.rows[0].records_failed
        };
      }

      return null;
    } catch (error) {
      console.error('[EventStore] Error fetching last completed sync:', error);
      return null;
    }
  }
}

// Singleton instance
export const eventStore = new EventStorePostgres();
