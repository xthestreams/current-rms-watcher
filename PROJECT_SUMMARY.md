# Current RMS Watcher - Project Summary

## What This Application Does

The Current RMS Watcher is a **headless webhook monitoring application** designed to:

1. **Listen for Changes**: Receives real-time webhook notifications when opportunities are created, updated, or change stages in Current RMS
2. **Execute Business Rules**: Automatically applies custom business logic based on opportunity stage changes
3. **Provide Visibility**: Offers a health dashboard showing all events, including:
   - Opportunity ID
   - Customer Name
   - User ID who made the change
   - Timestamp and action type
   - Processing status

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Current RMS                            │
│  (User updates opportunity → webhook triggered)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTPS POST
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Vercel Serverless Function                     │
│                  /api/webhook                               │
│                                                             │
│  1. Receives webhook payload                               │
│  2. Extracts opportunity details                           │
│  3. Stores event in memory                                 │
│  4. Executes business rules                                │
│  5. Returns 200 OK                                         │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             ▼                            ▼
    ┌────────────────┐         ┌──────────────────┐
    │  Event Store   │         │ Business Rules   │
    │  (In-Memory)   │         │     Engine       │
    └────────┬───────┘         └─────────┬────────┘
             │                           │
             │                           ▼
             │                  ┌─────────────────────┐
             │                  │  Custom Actions:    │
             │                  │  - Notifications    │
             │                  │  - External APIs    │
             │                  │  - Logging          │
             │                  │  - Validations      │
             │                  └─────────────────────┘
             │
             ▼
    ┌─────────────────────────────────────┐
    │      Health Dashboard (Next.js)     │
    │   https://your-app.vercel.app       │
    │                                     │
    │  - Real-time event monitoring       │
    │  - System health metrics            │
    │  - Auto-refresh every 5 seconds     │
    └─────────────────────────────────────┘
```

## Key Files and Their Purpose

### Core Application Files

- **`pages/api/webhook.ts`** - Receives and processes webhooks from Current RMS
- **`pages/api/events.ts`** - API endpoint to retrieve recent events
- **`pages/api/health.ts`** - Health check and metrics endpoint
- **`pages/index.tsx`** - Health dashboard UI
- **`lib/eventStore.ts`** - In-memory storage for events (replace with DB for production)
- **`lib/businessRules.ts`** - Business rules engine and rule definitions
- **`types/index.ts`** - TypeScript type definitions

### Configuration Files

- **`package.json`** - Dependencies and scripts
- **`tsconfig.json`** - TypeScript configuration
- **`next.config.js`** - Next.js configuration
- **`tailwind.config.js`** - Tailwind CSS styling
- **`vercel.json`** - Vercel deployment settings
- **`.env.example`** - Environment variables template

### Documentation

- **`README.md`** - Complete application documentation
- **`DEPLOYMENT.md`** - Deployment guide with step-by-step instructions
- **`test-webhook.js`** - Testing script to simulate webhooks

## Technology Stack

- **Next.js 14** - React framework for web application
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vercel** - Hosting and serverless functions
- **date-fns** - Date formatting utilities

## Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd current-rms-watcher
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Current RMS subdomain and API key
```

### 3. Run Locally
```bash
npm run dev
```
Visit http://localhost:3000 to see the dashboard

### 4. Test the Webhook
```bash
node test-webhook.js
```
This sends a test event to your local server

### 5. Deploy to Vercel
```bash
npm i -g vercel
vercel
```

### 6. Configure Current RMS
Create a webhook pointing to your Vercel URL:
```bash
curl -X POST "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key" \
  --header "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Opportunity Watcher",
      "event": "opportunity_update",
      "target_url": "https://YOUR_APP.vercel.app/api/webhook",
      "active": true
    }
  }'
```

## Customizing Business Rules

The application includes 4 example business rules in `lib/businessRules.ts`:

1. **Notify on Order Conversion** - Triggered when opportunity converts to order
2. **Log All Status Changes** - Logs updates for audit trail
3. **Validate Reserved Orders** - Runs checks when marked as reserved
4. **Alert on Lost Opportunities** - Sends alerts for lost opportunities

### Adding Your Own Rule

```typescript
rulesEngine.registerRule({
  id: 'my-custom-rule',
  name: 'My Custom Rule',
  description: 'What this rule does',
  trigger: {
    actionTypes: ['convert_to_order']
  },
  action: async (event: ProcessedEvent) => {
    // Your custom logic here
    console.log(`Processing ${event.opportunityId}`);
    
    // Examples:
    // - await sendEmail(event.customerName);
    // - await updateCRM(event);
    // - await createInvoice(event.opportunityId);
  },
  enabled: true
});
```

## Dashboard Features

The health dashboard provides:

### Metrics Cards
- **Status** - System health indicator
- **Total Events** - Cumulative webhook events received
- **Successful** - Successfully processed events
- **Failed** - Events that encountered errors
- **Uptime** - Time since application started

### Events Table
Real-time table showing:
- **Timestamp** - When the event occurred
- **Opportunity ID** - The opportunity that changed
- **Customer Name** - Organization associated with opportunity
- **User ID** - Who made the change
- **User Name** - Name of the user
- **Action Type** - Type of change (update, convert_to_order, etc.)
- **Status** - Processing status with visual indicators

### Auto-Refresh
- Updates every 5 seconds automatically
- Toggle on/off as needed
- Manual refresh button available

## Webhook Events Supported

The application can monitor all Current RMS opportunity events:

### Generic Actions
- `opportunity_create` - New opportunity
- `opportunity_update` - General update
- `opportunity_destroy` - Opportunity deleted

### Stage Changes
- `opportunity_convert_to_order`
- `opportunity_convert_to_quotation`
- `opportunity_mark_as_provisional`
- `opportunity_mark_as_reserved`
- `opportunity_mark_as_lost`
- `opportunity_mark_as_dead`

### Operations
- `opportunity_allocate`
- `opportunity_prepare`
- `opportunity_book_out`
- `opportunity_check_in`
- `opportunity_cancel`
- `opportunity_complete`

### Item Management
- `opportunity_create_item`
- `opportunity_update_item`
- `opportunity_destroy_item`

## Production Considerations

### Current Implementation
- ✅ Webhook receiving
- ✅ Event processing
- ✅ Business rules
- ✅ Health dashboard
- ✅ Auto-refresh
- ⚠️  In-memory storage (not persistent)

### For Production Use, Add:

1. **Persistent Database**
   - Replace `eventStore.ts` with PostgreSQL, MongoDB, or Supabase
   - Ensures events survive server restarts
   - Enables historical analytics

2. **Authentication**
   - Add login to dashboard
   - Use Vercel Edge Middleware
   - Consider OAuth providers

3. **Webhook Verification**
   - Validate webhook signatures
   - Prevent unauthorized requests

4. **Monitoring**
   - Add error tracking (Sentry)
   - Set up alerts for failures
   - Monitor webhook delivery success rate

5. **Rate Limiting**
   - Prevent abuse
   - Handle burst traffic

6. **Queue System**
   - Process heavy tasks asynchronously
   - Use SQS, RabbitMQ, or Vercel KV

## Testing

### Local Testing
```bash
# Start the dev server
npm run dev

# In another terminal, send test webhook
node test-webhook.js

# Try different event types
node test-webhook.js http://localhost:3000/api/webhook convert_to_order
node test-webhook.js http://localhost:3000/api/webhook mark_as_reserved
```

### Production Testing
```bash
# Send to your Vercel deployment
node test-webhook.js https://your-app.vercel.app/api/webhook
```

### Manual API Testing
```bash
# Check health
curl https://your-app.vercel.app/api/health

# Get events
curl https://your-app.vercel.app/api/events?limit=10
```

## Common Use Cases

### 1. Send Email Notifications
When opportunity converts to order, email sales team:
```typescript
action: async (event) => {
  await sendEmail({
    to: 'sales@company.com',
    subject: `New Order: ${event.opportunityName}`,
    body: `Customer: ${event.customerName}\nOpportunity ID: ${event.opportunityId}`
  });
}
```

### 2. Update External CRM
Sync opportunity status to Salesforce/HubSpot:
```typescript
action: async (event) => {
  await updateCRM({
    opportunityId: event.opportunityId,
    status: event.newStatus,
    customerName: event.customerName
  });
}
```

### 3. Inventory Management
Reserve inventory when marked as reserved:
```typescript
action: async (event) => {
  if (event.actionType === 'mark_as_reserved') {
    await reserveInventory(event.opportunityId);
  }
}
```

### 4. Slack Notifications
Alert team in Slack:
```typescript
action: async (event) => {
  await postToSlack({
    channel: '#sales',
    text: `🎉 ${event.customerName} - Order confirmed!`
  });
}
```

## Support and Resources

- **Application Code**: All files in `/current-rms-watcher/`
- **README**: Comprehensive usage guide
- **DEPLOYMENT.md**: Step-by-step deployment instructions
- **Current RMS API Docs**: https://api.current-rms.com/doc
- **Vercel Docs**: https://vercel.com/docs

## Next Steps

1. ✅ Review the README.md for detailed documentation
2. ✅ Read DEPLOYMENT.md for deployment instructions
3. ✅ Customize business rules in `lib/businessRules.ts`
4. ✅ Test locally with `test-webhook.js`
5. ✅ Deploy to Vercel
6. ✅ Configure webhooks in Current RMS
7. ✅ Monitor events in the dashboard

## File Structure
```
current-rms-watcher/
├── pages/
│   ├── api/
│   │   ├── webhook.ts       # Webhook receiver
│   │   ├── events.ts        # Events API
│   │   └── health.ts        # Health check
│   ├── index.tsx            # Dashboard UI
│   └── _app.tsx             # App wrapper
├── lib/
│   ├── eventStore.ts        # Event storage
│   └── businessRules.ts     # Rules engine
├── types/
│   └── index.ts             # TypeScript types
├── styles/
│   └── globals.css          # Global styles
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── next.config.js           # Next.js config
├── tailwind.config.js       # Tailwind config
├── vercel.json              # Vercel config
├── test-webhook.js          # Test script
├── README.md                # Documentation
├── DEPLOYMENT.md            # Deploy guide
└── .env.example             # Env template
```

---

**You're ready to start monitoring Current RMS opportunities! 🚀**
