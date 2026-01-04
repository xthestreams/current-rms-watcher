// API Route: /api/migrate-database
// Run database migrations to update schema

import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const migrations: any[] = [];
  const errors: any[] = [];

  try {
    // Check if database is configured
    if (!process.env.POSTGRES_URL) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured',
        message: 'POSTGRES_URL environment variable not set'
      });
    }

    // Migration 1: Add raw_payload column if it doesn't exist
    try {
      await sql`
        ALTER TABLE webhook_events
        ADD COLUMN IF NOT EXISTS raw_payload JSONB
      `;
      migrations.push({
        name: 'Add raw_payload column to webhook_events',
        status: 'success',
        message: 'Column added or already exists'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      // If error is "relation does not exist", the table needs to be created
      if (errorMsg.includes('does not exist')) {
        migrations.push({
          name: 'Add raw_payload column to webhook_events',
          status: 'skipped',
          message: 'Table does not exist - will be created on first webhook'
        });
      } else {
        errors.push({
          name: 'Add raw_payload column to webhook_events',
          error: errorMsg
        });
      }
    }

    // Migration 2: Ensure all required indexes exist
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_webhook_events_timestamp
        ON webhook_events(timestamp DESC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_webhook_events_opportunity_id
        ON webhook_events(opportunity_id)
      `;
      migrations.push({
        name: 'Create indexes on webhook_events',
        status: 'success',
        message: 'Indexes created or already exist'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMsg.includes('does not exist')) {
        errors.push({
          name: 'Create indexes on webhook_events',
          error: errorMsg
        });
      }
    }

    // Migration 3: Update sync_metadata table if needed
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id SERIAL PRIMARY KEY,
          sync_type TEXT NOT NULL,
          status TEXT NOT NULL,
          started_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP,
          records_synced INTEGER DEFAULT 0,
          records_failed INTEGER DEFAULT 0,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      migrations.push({
        name: 'Ensure sync_metadata table exists',
        status: 'success',
        message: 'Table created or already exists'
      });
    } catch (error) {
      errors.push({
        name: 'Ensure sync_metadata table exists',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Migration 4: Create risk_settings table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS risk_settings (
          id SERIAL PRIMARY KEY,
          setting_key TEXT NOT NULL UNIQUE,
          setting_value JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Create index on setting_key for fast lookups
      await sql`
        CREATE INDEX IF NOT EXISTS idx_risk_settings_key
        ON risk_settings(setting_key)
      `;

      migrations.push({
        name: 'Create risk_settings table',
        status: 'success',
        message: 'Table and indexes created or already exist'
      });
    } catch (error) {
      errors.push({
        name: 'Create risk_settings table',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Migration 5: Ensure opportunities table has all required columns
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS opportunities (
          id INTEGER PRIMARY KEY,
          name TEXT,
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
          charge_total DECIMAL,
          total_value DECIMAL,
          data JSONB,
          synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      // Add index on opportunity_status
      await sql`
        CREATE INDEX IF NOT EXISTS idx_opportunities_status
        ON opportunities(opportunity_status)
      `;

      // Add index on starts_at
      await sql`
        CREATE INDEX IF NOT EXISTS idx_opportunities_starts_at
        ON opportunities(starts_at)
      `;

      migrations.push({
        name: 'Ensure opportunities table schema',
        status: 'success',
        message: 'Table and indexes created or already exist'
      });
    } catch (error) {
      errors.push({
        name: 'Ensure opportunities table schema',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    const success = errors.length === 0;

    return res.status(success ? 200 : 500).json({
      success,
      message: success
        ? 'All migrations completed successfully'
        : 'Some migrations failed',
      migrations,
      errors,
      summary: {
        total: migrations.length,
        successful: migrations.filter(m => m.status === 'success').length,
        skipped: migrations.filter(m => m.status === 'skipped').length,
        failed: errors.length
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      migrations,
      errors
    });
  }
}
