# Current RMS Watcher

A headless webhook watcher application for monitoring Current RMS opportunity stage changes with real-time business rule automation and a health dashboard for testing and observability.

## Features

- 🎯 **Webhook Integration**: Real-time monitoring of Current RMS opportunity changes
- 📊 **Health Dashboard**: Live monitoring of events, metrics, and system status
- ⚡ **Business Rules Engine**: Configurable automation based on opportunity stage changes
- 🔄 **Auto-refresh**: Dashboard updates every 5 seconds
- 📝 **Event Logging**: In-memory event storage (easily upgradable to persistent database)
- 🎨 **Clean UI**: Modern, responsive interface built with Next.js and Tailwind CSS

## Architecture

```
Current RMS → Webhook → Your Application → Business Rules → Actions
                              ↓
                        Health Dashboard
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Current RMS account with API access enabled

### Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` and add your Current RMS credentials:

```env
CURRENT_RMS_SUBDOMAIN=your-subdomain
CURRENT_RMS_API_KEY=your-api-key-here
WEBHOOK_SECRET=optional-webhook-secret
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) to see the health dashboard

## Setting Up Webhooks in Current RMS

### Step 1: Enable Webhooks

1. Log into Current RMS
2. Go to **System Setup > Company Information**
3. Enable webhooks functionality

### Step 2: Create Webhook via API

Use the Current RMS API to create a webhook subscription:

```bash
curl -X POST "https://api.current-rms.com/api/v1/webhooks?apikey=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Opportunity Updates Watcher",
      "event": "opportunity_update",
      "target_url": "https://your-app.vercel.app/api/webhook",
      "active": true
    }
  }'
```

### Step 3: Subscribe to Multiple Events (Optional)

Create additional webhooks for specific events:

```javascript
// Convert to order
{
  "event": "opportunity_convert_to_order",
  "target_url": "https://your-app.vercel.app/api/webhook"
}

// Mark as reserved
{
  "event": "opportunity_mark_as_reserved",
  "target_url": "https://your-app.vercel.app/api/webhook"
}

// Mark as lost
{
  "event": "opportunity_mark_as_lost",
  "target_url": "https://your-app.vercel.app/api/webhook"
}
```

## Customizing Business Rules

Edit `lib/businessRules.ts` to add your own automation:

```typescript
rulesEngine.registerRule({
  id: 'your-custom-rule',
  name: 'Your Custom Rule',
  description: 'Description of what this rule does',
  trigger: {
    actionTypes: ['convert_to_order', 'mark_as_reserved']
  },
  action: async (event: ProcessedEvent) => {
    // Your custom logic here
    console.log(`Processing event for opportunity ${event.opportunityId}`);
    
    // Examples:
    // - Send email notification
    // - Update external CRM
    // - Create invoice
    // - Notify team via Slack
    // - Update inventory system
  },
  enabled: true
});
```

## Dashboard Features

The health dashboard (`/`) displays:

- **Status**: Current health status of the watcher
- **Total Events**: Number of webhook events received
- **Successful**: Successfully processed events
- **Failed**: Events that encountered errors
- **Uptime**: Time since application started
- **Recent Events Table**: Real-time list showing:
  - Timestamp
  - Opportunity ID
  - Customer Name
  - User ID (who made the change)
  - User Name
  - Action Type
  - Processing Status

## API Endpoints

### `POST /api/webhook`
Receives webhook POST requests from Current RMS

**Request Body:**
```json
{
  "action": {
    "id": 1364,
    "subject_id": 100,
    "subject_type": "Opportunity",
    "member_id": 1,
    "action_type": "update",
    "name": "Opportunity Name",
    "member": { ... },
    "subject": { ... }
  }
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "evt_1364_1234567890",
  "message": "Webhook received and processed"
}
```

### `GET /api/events`
Retrieve recent events

**Query Parameters:**
- `limit` (optional): Number of events to return (default: 50)

**Response:**
```json
{
  "success": true,
  "events": [...],
  "count": 50
}
```

### `GET /api/health`
Health check and metrics

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "metrics": {
    "totalEvents": 150,
    "successfulEvents": 145,
    "failedEvents": 5,
    "lastEventTime": "2025-01-01T12:00:00Z",
    "uptime": 3600
  }
}
```

## Deploying to Vercel

### Method 1: Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts and add environment variables when asked

### Method 2: Vercel Dashboard

1. Push code to GitHub/GitLab/Bitbucket
2. Visit [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Add environment variables:
   - `CURRENT_RMS_SUBDOMAIN`
   - `CURRENT_RMS_API_KEY`
   - `WEBHOOK_SECRET` (optional)
6. Deploy

### After Deployment

1. Note your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Update your Current RMS webhooks to point to:
   - `https://your-app.vercel.app/api/webhook`

## Production Considerations

### 1. Persistent Storage

The current implementation uses in-memory storage. For production, replace `lib/eventStore.ts` with a database:

- **PostgreSQL** with Prisma
- **MongoDB** with Mongoose
- **Redis** for high-performance caching
- **Supabase** for easy setup

### 2. Security

- Add webhook signature verification
- Implement rate limiting
- Use environment variables for all secrets
- Add authentication to dashboard
- Enable CORS protection

### 3. Monitoring

- Set up error tracking (Sentry, LogRocket)
- Configure uptime monitoring (UptimeRobot, Pingdom)
- Add application performance monitoring (New Relic, Datadog)

### 4. Scaling

- Use a message queue (SQS, RabbitMQ) for async processing
- Add worker processes for heavy computations
- Implement circuit breakers for external API calls
- Cache frequently accessed data

## Event Types Reference

Common opportunity webhook events:

- `opportunity_create` - New opportunity created
- `opportunity_update` - Opportunity updated
- `opportunity_convert_to_order` - Converted to order
- `opportunity_convert_to_quotation` - Converted to quotation
- `opportunity_mark_as_provisional` - Marked as provisional
- `opportunity_mark_as_reserved` - Marked as reserved
- `opportunity_mark_as_lost` - Marked as lost
- `opportunity_mark_as_dead` - Marked as dead
- `opportunity_cancel` - Opportunity cancelled
- `opportunity_complete` - Opportunity completed
- `opportunity_create_item` - Item added to opportunity
- `opportunity_update_item` - Item updated on opportunity
- `opportunity_destroy_item` - Item removed from opportunity

See [Current RMS Webhook Documentation](https://help.current-rms.com/en/articles/5223423-opportunity) for complete list.

## Troubleshooting

### Webhooks Not Receiving

1. Check webhook is active in Current RMS
2. Verify URL is correct and publicly accessible
3. Check Vercel function logs
4. Ensure webhook endpoint returns 200 OK within 30 seconds

### Events Not Showing in Dashboard

1. Check browser console for errors
2. Verify API routes are responding
3. Check auto-refresh is enabled
4. Try manual refresh

### Business Rules Not Executing

1. Check rule is enabled (`enabled: true`)
2. Verify trigger conditions match event
3. Check console logs for error messages
4. Add debugging to rule action

## License

MIT

## Support

For issues related to:
- **Current RMS API**: Contact Current RMS support
- **This application**: Create an issue in the repository

## Contributing

Contributions welcome! Please feel free to submit a Pull Request.
