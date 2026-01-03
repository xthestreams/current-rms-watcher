# Database Setup

This application uses Vercel Postgres for persistent event storage.

## Setup Steps

### 1. Create Postgres Database in Vercel

1. Go to your project in the Vercel dashboard
2. Navigate to **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose a name (e.g., "current-rms-events")
6. Select a region (should match your deployment region: `iad1`)
7. Click **Create**

### 2. Connect Database to Project

Vercel will automatically add these environment variables to your project:

- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

No manual configuration needed!

### 3. Deploy

The database tables will be created automatically on first use:

- `webhook_events` - Stores all webhook events
- `webhook_metadata` - Stores system metadata like start time

### 4. Verify

After deployment:

1. Visit your dashboard
2. Click "Test Webhook"
3. The event should persist across page refreshes
4. Check Vercel logs to see database operations

## Database Schema

### `webhook_events` table

Stores all webhook events with raw payloads for event replay capability.

```sql
CREATE TABLE webhook_events (
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
);
```

### `webhook_metadata` table

Stores system metadata like start time.

```sql
CREATE TABLE webhook_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `augmented_opportunities` table

Stores business intelligence data augmenting Current RMS opportunities.

```sql
CREATE TABLE augmented_opportunities (
  opportunity_id INTEGER PRIMARY KEY,
  workflow_status TEXT,
  risk_level TEXT,
  risk_notes TEXT,
  financial_health_score INTEGER,
  custom_calculations JSONB,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `audit_log` table

Tracks all changes for compliance and debugging.

```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  user_id INTEGER,
  user_name TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `workflow_instances` table

Tracks workflow execution for integrations with external systems.

```sql
CREATE TABLE workflow_instances (
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
);
```

### `external_integrations` table

Links opportunities to external systems (Xero, Monday, TeamTrack, etc.) using UIDs.

```sql
CREATE TABLE external_integrations (
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
);
```

## API Endpoints

The application provides several API endpoints for managing data:

### Event Management
- `GET /api/events?limit=50` - Get recent events
- `GET /api/health` - System health and metrics
- `POST /api/replay` - Replay an event from raw payload
  ```json
  { "eventId": "evt_123_456789" }
  ```

### Reconciliation
- `GET /api/reconciliation?type=unaugmented` - Find opportunities without augmented data
- `GET /api/reconciliation?type=missing-integration&system=xero` - Find opportunities missing specific integration
- `GET /api/reconciliation?type=stale-integrations&system=monday` - Find stale/failed integrations
- `GET /api/reconciliation?type=all` - Run all reconciliation queries

### Audit Trail
- `GET /api/audit?entityType=opportunity&entityId=12345` - Get audit trail for an entity

## Querying Data (Optional)

You can query your database directly using Vercel's SQL editor:

1. Go to **Storage** → Your Postgres database
2. Click **Query** tab
3. Run SQL queries:

```sql
-- View recent events with raw payloads
SELECT id, timestamp, opportunity_name, action_type, processed
FROM webhook_events
ORDER BY timestamp DESC
LIMIT 10;

-- Count events by action type
SELECT action_type, COUNT(*) as count
FROM webhook_events
GROUP BY action_type
ORDER BY count DESC;

-- View failed events
SELECT * FROM webhook_events WHERE error IS NOT NULL;

-- Find opportunities without augmented data
SELECT DISTINCT we.opportunity_id, we.opportunity_name
FROM webhook_events we
LEFT JOIN augmented_opportunities ao ON we.opportunity_id = ao.opportunity_id
WHERE ao.opportunity_id IS NULL;

-- Check audit trail for an opportunity
SELECT * FROM audit_log
WHERE entity_type = 'opportunity' AND entity_id = '12345'
ORDER BY timestamp DESC;

-- View active workflows
SELECT * FROM workflow_instances
WHERE status = 'running'
ORDER BY started_at DESC;

-- Check integration sync status
SELECT system_name, COUNT(*) as count, sync_status
FROM external_integrations
GROUP BY system_name, sync_status
ORDER BY system_name, sync_status;

-- Clear all events (if needed)
DELETE FROM webhook_events;
```

## Troubleshooting

**Error: "relation webhook_events does not exist"**
- Tables are created on first API call
- Visit your dashboard or send a test webhook to trigger initialization

**Events not persisting**
- Check Vercel logs for database errors
- Verify environment variables are set
- Ensure database is in the same region as your deployment

**Slow performance**
- Indexes are created automatically for common queries
- Free tier has connection limits - consider upgrading if needed
