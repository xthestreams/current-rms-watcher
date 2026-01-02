# Quick Start Guide

## You've Successfully Deployed! Now Set Up Webhooks

Your Current RMS API is working correctly. Now let's connect your Vercel watcher.

### Step 1: Get Your Vercel URL

After deploying to Vercel, you'll have a URL like:
- `https://current-rms-watcher.vercel.app`
- `https://your-project-name.vercel.app`

### Step 2: Set Your Credentials

```bash
export CURRENT_RMS_SUBDOMAIN=your-subdomain
export CURRENT_RMS_API_KEY=your-api-key
```

### Step 3: Run the Setup Script

We've made this super easy. Just run:

```bash
./setup-webhooks.sh
```

This will:
1. Ask for your Vercel URL
2. Create 13 webhooks for different opportunity events
3. Verify they were created successfully

**That's it!** Your watcher will now receive events.

---

## Manual Setup (Alternative)

If you prefer to create webhooks manually:

### Create a Single Webhook

```bash
curl -X POST "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key" \
  --header "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Watcher - All Updates",
      "event": "opportunity_update",
      "target_url": "https://YOUR-APP.vercel.app/api/webhook",
      "active": true
    }
  }'
```

### Recommended Events to Monitor

Based on your existing webhooks, here are the key events:

**Status Changes** (Most Important):
- `opportunity_mark_as_reserved` - When opportunities are confirmed
- `opportunity_convert_to_order` - When quotes become orders
- `opportunity_complete` - When jobs are completed
- `opportunity_mark_as_lost` - Track lost opportunities

**Lifecycle Events**:
- `opportunity_create` - New opportunities
- `opportunity_update` - Any changes
- `opportunity_cancel` - Cancellations
- `opportunity_confirm` - Confirmations

**Item Management**:
- `opportunity_create_item` - Items added
- `opportunity_update_item` - Items changed
- `opportunity_destroy_item` - Items removed

---

## Verify Setup

### 1. List All Your Webhooks

```bash
./manage-webhooks.sh list
```

Or manually:
```bash
curl "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key"
```

### 2. Test Your Watcher

**Option A: Real Test**
1. Go to Current RMS
2. Update any opportunity (change a date, add a note, etc.)
3. Visit your Vercel dashboard
4. You should see the event appear within seconds!

**Option B: Simulated Test**
```bash
node test-webhook.js https://your-app.vercel.app/api/webhook
```

---

## Understanding Your Current Webhooks

I can see you already have webhooks configured:
- **TeamTrack integration** (20 webhooks) - Active and monitoring various events
- **Make.com integration** (3 webhooks) - For automation workflows

Your new Watcher will work alongside these existing integrations without conflicts.

---

## What Events Will You See?

Based on your business rules in `lib/businessRules.ts`, the watcher will:

### 1. **Notify on Order Conversion**
When `opportunity_convert_to_order` triggers:
- Logs to console
- Shows in dashboard
- Ready for your custom action (email, Slack, etc.)

### 2. **Log All Status Changes**
When opportunities are updated, marked reserved, lost, or dead:
- Creates audit trail
- Visible in dashboard

### 3. **Validate Reserved Orders**
When `opportunity_mark_as_reserved` triggers:
- Runs validation checks
- Ready to check inventory, pricing, dates

### 4. **Alert on Lost Opportunities**
When `opportunity_mark_as_lost` triggers:
- Sends alerts
- Ready to notify sales team

---

## Monitoring Your Watcher

### Dashboard View
Visit: `https://your-app.vercel.app`

You'll see:
- **Real-time events** as they happen
- **Opportunity IDs** and customer names
- **Who made the change** (User ID and Name)
- **Processing status** for each event
- **System health metrics**

### Health Check
```bash
curl https://your-app.vercel.app/api/health
```

### Recent Events API
```bash
curl https://your-app.vercel.app/api/events?limit=10
```

---

## Next Steps: Customize Business Rules

Edit `lib/businessRules.ts` to add your automation. Examples:

### Send Email Notification
```typescript
rulesEngine.registerRule({
  id: 'email-on-order',
  name: 'Email on New Order',
  trigger: {
    actionTypes: ['convert_to_order']
  },
  action: async (event) => {
    await sendEmail({
      to: 'sales@company.com',
      subject: `New Order #${event.opportunityId}`,
      body: `Customer: ${event.customerName}\nBy: ${event.userName}`
    });
  },
  enabled: true
});
```

### Update External System
```typescript
rulesEngine.registerRule({
  id: 'sync-to-crm',
  name: 'Sync to CRM',
  trigger: {
    actionTypes: ['mark_as_reserved']
  },
  action: async (event) => {
    await fetch('https://your-crm.com/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: event.opportunityId,
        status: 'reserved',
        customer: event.customerName
      })
    });
  },
  enabled: true
});
```

---

## Troubleshooting

### Webhooks Not Appearing in Dashboard?

**Check 1: Webhook is Created**
```bash
./manage-webhooks.sh list | grep Watcher
```

**Check 2: Webhook is Active**
Look for `"active": true` in the webhook configuration

**Check 3: Target URL is Correct**
Should be: `https://your-app.vercel.app/api/webhook` (note the `/api/webhook` path)

**Check 4: Test Direct Call**
```bash
node test-webhook.js https://your-app.vercel.app/api/webhook
```

**Check 5: Vercel Function Logs**
- Go to Vercel Dashboard
- Click on your project
- Go to "Functions" tab
- Click on `/api/webhook` to see logs

### Still Not Working?

1. Check Vercel deployment succeeded
2. Visit your app URL - should show the dashboard
3. Try the health endpoint: `https://your-app.vercel.app/api/health`
4. Review webhook logs in Current RMS (run `./manage-webhooks.sh logs`)

---

## Support

- **Webhook Issues**: Check Current RMS webhook logs
- **Vercel Issues**: Check Vercel function logs
- **Business Rules**: Console logs appear in Vercel functions

Happy monitoring! 🎉
