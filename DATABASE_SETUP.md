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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### `webhook_metadata` table

```sql
CREATE TABLE webhook_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Querying Data (Optional)

You can query your database directly using Vercel's SQL editor:

1. Go to **Storage** → Your Postgres database
2. Click **Query** tab
3. Run SQL queries:

```sql
-- View recent events
SELECT * FROM webhook_events ORDER BY timestamp DESC LIMIT 10;

-- Count events by action type
SELECT action_type, COUNT(*) as count
FROM webhook_events
GROUP BY action_type
ORDER BY count DESC;

-- View failed events
SELECT * FROM webhook_events WHERE error IS NOT NULL;

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
