// Opportunity Sync Service
// Handles syncing opportunities from Current RMS to local database

import { sql } from '@vercel/postgres';
import { getCurrentRMSClient, getDefaultDateRange } from './currentRmsClient';

export interface SyncResult {
  success: boolean;
  syncId?: number;
  recordsSynced: number;
  recordsFailed: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  logs?: string[];
  firstFailure?: {
    error: string;
    opportunityId: number;
    opportunityKeys: string[];
    opportunityData: any;
  };
}

export class OpportunitySync {
  /**
   * Perform initial full sync of opportunities
   * Fetches all opportunities from -30 days to +1 year
   */
  async initialSync(): Promise<SyncResult> {
    const startedAt = new Date();
    let syncId: number | undefined;
    let recordsSynced = 0;
    let recordsFailed = 0;
    const logs: string[] = [];
    let firstFailure: SyncResult['firstFailure'] = undefined;

    const addLog = (message: string) => {
      console.log(message);
      logs.push(message);
    };

    try {
      // Create sync record
      const syncRecord = await sql`
        INSERT INTO sync_metadata (sync_type, status, started_at, metadata)
        VALUES ('initial_sync', 'running', ${startedAt.toISOString()}, ${JSON.stringify({ dateRange: 'auto' })})
        RETURNING id
      `;
      syncId = syncRecord.rows[0].id;

      addLog(`[OpportunitySync] Starting initial sync (ID: ${syncId})`);

      // Get date range
      const { startDate, endDate } = getDefaultDateRange();
      addLog(`[OpportunitySync] Date range: ${startDate} to ${endDate}`);

      // Fetch all opportunities from Current RMS
      const client = getCurrentRMSClient();
      const opportunities = await client.getAllOpportunities(startDate, endDate);

      addLog(`[OpportunitySync] Fetched ${opportunities.length} opportunities from Current RMS`);

      // Upsert each opportunity
      for (const opp of opportunities) {
        try {
          await this.upsertOpportunity(opp);
          recordsSynced++;
          if (recordsSynced === 1) {
            addLog(`[OpportunitySync] ✅ First opportunity synced successfully (ID: ${opp.id})`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          addLog(`[OpportunitySync] ❌ Failed to sync opportunity ${opp.id}: ${errorMessage}`);
          recordsFailed++;

          // Capture first failure in detail
          if (recordsFailed === 1) {
            firstFailure = {
              error: errorMessage,
              opportunityId: opp.id,
              opportunityKeys: Object.keys(opp),
              opportunityData: opp
            };
            addLog(`[OpportunitySync] First failure details captured`);
            addLog(`[OpportunitySync] Error: ${errorMessage}`);
            addLog(`[OpportunitySync] Opportunity keys: ${Object.keys(opp).join(', ')}`);
          }
        }
      }

      const completedAt = new Date();

      // Update sync record
      await sql`
        UPDATE sync_metadata
        SET status = 'completed',
            completed_at = ${completedAt.toISOString()},
            records_synced = ${recordsSynced},
            records_failed = ${recordsFailed}
        WHERE id = ${syncId}
      `;

      addLog(`[OpportunitySync] Initial sync completed: ${recordsSynced} synced, ${recordsFailed} failed`);

      return {
        success: true,
        syncId,
        recordsSynced,
        recordsFailed,
        startedAt,
        completedAt,
        logs,
        firstFailure
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[OpportunitySync] Initial sync failed:', error);

      if (syncId) {
        await sql`
          UPDATE sync_metadata
          SET status = 'failed',
              completed_at = ${new Date().toISOString()},
              records_synced = ${recordsSynced},
              records_failed = ${recordsFailed},
              error = ${errorMessage}
          WHERE id = ${syncId}
        `;
      }

      return {
        success: false,
        syncId,
        recordsSynced,
        recordsFailed,
        error: errorMessage,
        startedAt
      };
    }
  }

  /**
   * Sync a single opportunity by ID
   */
  async syncOpportunity(opportunityId: number): Promise<void> {
    console.log(`[OpportunitySync] Syncing opportunity ${opportunityId}`);

    const client = getCurrentRMSClient();
    const opportunity = await client.getOpportunity(opportunityId);

    await this.upsertOpportunity(opportunity);

    // Update last_webhook_at timestamp
    await sql`
      UPDATE opportunities
      SET last_webhook_at = CURRENT_TIMESTAMP
      WHERE id = ${opportunityId}
    `;

    console.log(`[OpportunitySync] Opportunity ${opportunityId} synced`);
  }

  /**
   * Incremental sync - fetch opportunities updated since last sync
   */
  async incrementalSync(): Promise<SyncResult> {
    const startedAt = new Date();
    let syncId: number | undefined;
    let recordsSynced = 0;
    let recordsFailed = 0;

    try {
      // Get last successful sync time
      const lastSync = await sql`
        SELECT completed_at
        FROM sync_metadata
        WHERE sync_type IN ('initial_sync', 'incremental_sync')
          AND status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 1
      `;

      const since = lastSync.rows.length > 0
        ? new Date(lastSync.rows[0].completed_at).toISOString()
        : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Last 24 hours

      // Create sync record
      const syncRecord = await sql`
        INSERT INTO sync_metadata (sync_type, status, started_at, metadata)
        VALUES ('incremental_sync', 'running', ${startedAt.toISOString()}, ${JSON.stringify({ since })})
        RETURNING id
      `;
      syncId = syncRecord.rows[0].id;

      console.log(`[OpportunitySync] Starting incremental sync (ID: ${syncId}, since: ${since})`);

      // Fetch updated opportunities
      const client = getCurrentRMSClient();
      const response = await client.getUpdatedOpportunities(since);
      const opportunities = response.opportunities || [];

      console.log(`[OpportunitySync] Fetched ${opportunities.length} updated opportunities`);

      // Upsert each opportunity
      for (const opp of opportunities) {
        try {
          await this.upsertOpportunity(opp);
          recordsSynced++;
          if (recordsSynced === 1) {
            // Log first successful opportunity structure for debugging
            console.log(`[OpportunitySync] First opportunity structure:`, JSON.stringify(opp, null, 2));
          }
        } catch (error) {
          console.error(`[OpportunitySync] Failed to sync opportunity ${opp.id}:`, error);
          console.error(`[OpportunitySync] Opportunity data:`, JSON.stringify(opp, null, 2));
          recordsFailed++;

          // Log first failure in detail
          if (recordsFailed === 1) {
            console.error(`[OpportunitySync] First failure details:`, {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              opportunityId: opp.id,
              opportunityKeys: Object.keys(opp)
            });
          }
        }
      }

      const completedAt = new Date();

      // Update sync record
      await sql`
        UPDATE sync_metadata
        SET status = 'completed',
            completed_at = ${completedAt.toISOString()},
            records_synced = ${recordsSynced},
            records_failed = ${recordsFailed}
        WHERE id = ${syncId}
      `;

      console.log(`[OpportunitySync] Incremental sync completed: ${recordsSynced} synced, ${recordsFailed} failed`);

      return {
        success: true,
        syncId,
        recordsSynced,
        recordsFailed,
        startedAt,
        completedAt
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[OpportunitySync] Incremental sync failed:', error);

      if (syncId) {
        await sql`
          UPDATE sync_metadata
          SET status = 'failed',
              completed_at = ${new Date().toISOString()},
              records_synced = ${recordsSynced},
              records_failed = ${recordsFailed},
              error = ${errorMessage}
          WHERE id = ${syncId}
        `;
      }

      return {
        success: false,
        syncId,
        recordsSynced,
        recordsFailed,
        error: errorMessage,
        startedAt
      };
    }
  }

  /**
   * Upsert a single opportunity into the database
   */
  private async upsertOpportunity(opp: any): Promise<void> {
    await sql`
      INSERT INTO opportunities (
        id, name, subject, description,
        starts_at, ends_at, opportunity_status,
        created_at_rms, updated_at_rms,
        venue_name, organisation_id, organisation_name,
        owner_id, owner_name,
        charge_total, total_value,
        data, synced_at
      ) VALUES (
        ${opp.id},
        ${opp.name},
        ${opp.subject || null},
        ${opp.description || null},
        ${opp.starts_at || null},
        ${opp.ends_at || null},
        ${opp.opportunity_status || null},
        ${opp.created_at || null},
        ${opp.updated_at || null},
        ${opp.venue_name || null},
        ${opp.organisation_id || null},
        ${opp.organisation_name || null},
        ${opp.owner_id || null},
        ${opp.owner_name || null},
        ${opp.charge_total || null},
        ${opp.total_value || null},
        ${JSON.stringify(opp)},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        subject = EXCLUDED.subject,
        description = EXCLUDED.description,
        starts_at = EXCLUDED.starts_at,
        ends_at = EXCLUDED.ends_at,
        opportunity_status = EXCLUDED.opportunity_status,
        created_at_rms = EXCLUDED.created_at_rms,
        updated_at_rms = EXCLUDED.updated_at_rms,
        venue_name = EXCLUDED.venue_name,
        organisation_id = EXCLUDED.organisation_id,
        organisation_name = EXCLUDED.organisation_name,
        owner_id = EXCLUDED.owner_id,
        owner_name = EXCLUDED.owner_name,
        charge_total = EXCLUDED.charge_total,
        total_value = EXCLUDED.total_value,
        data = EXCLUDED.data,
        synced_at = CURRENT_TIMESTAMP
    `;
  }

  /**
   * Get last sync status
   */
  async getLastSyncStatus(): Promise<any> {
    const result = await sql`
      SELECT *
      FROM sync_metadata
      ORDER BY started_at DESC
      LIMIT 1
    `;

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit: number = 10): Promise<any[]> {
    const result = await sql`
      SELECT *
      FROM sync_metadata
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;

    return result.rows;
  }
}

// Singleton instance
export const opportunitySync = new OpportunitySync();
