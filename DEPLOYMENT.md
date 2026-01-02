# Deployment Guide

## Quick Deploy to Vercel

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/current-rms-watcher.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Add Environment Variables**
   In the Vercel project settings, add:
   - `CURRENT_RMS_SUBDOMAIN` = your-subdomain (without .current-rms.com)
   - `CURRENT_RMS_API_KEY` = your-api-key
   - `WEBHOOK_SECRET` = optional-secret (for webhook verification)

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Note your deployment URL (e.g., `https://current-rms-watcher.vercel.app`)

### Option 2: Deploy with Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Add Environment Variables**
   ```bash
   vercel env add CURRENT_RMS_SUBDOMAIN
   vercel env add CURRENT_RMS_API_KEY
   vercel env add WEBHOOK_SECRET
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Post-Deployment Configuration

### 1. Configure Current RMS Webhooks

Once deployed, you need to register your webhook endpoint with Current RMS.

**Using cURL:**

```bash
curl -X POST "https://api.current-rms.com/api/v1/webhooks?apikey=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Opportunity Watcher - All Updates",
      "event": "opportunity_update",
      "target_url": "https://YOUR_VERCEL_URL.vercel.app/api/webhook",
      "active": true
    }
  }'
```

**Register multiple webhooks for specific events:**

```bash
# Convert to Order
curl -X POST "https://api.current-rms.com/api/v1/webhooks?apikey=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Opportunity Watcher - Convert to Order",
      "event": "opportunity_convert_to_order",
      "target_url": "https://YOUR_VERCEL_URL.vercel.app/api/webhook",
      "active": true
    }
  }'

# Mark as Reserved
curl -X POST "https://api.current-rms.com/api/v1/webhooks?apikey=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Opportunity Watcher - Mark Reserved",
      "event": "opportunity_mark_as_reserved",
      "target_url": "https://YOUR_VERCEL_URL.vercel.app/api/webhook",
      "active": true
    }
  }'

# Mark as Lost
curl -X POST "https://api.current-rms.com/api/v1/webhooks?apikey=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Opportunity Watcher - Mark Lost",
      "event": "opportunity_mark_as_lost",
      "target_url": "https://YOUR_VERCEL_URL.vercel.app/api/webhook",
      "active": true
    }
  }'
```

### 2. Verify Webhook Registration

List your webhooks to confirm:

```bash
curl "https://api.current-rms.com/api/v1/webhooks?apikey=YOUR_API_KEY"
```

### 3. Test the Webhook

**Option A: Update an opportunity in Current RMS**
- Make a change to any opportunity
- Check your dashboard at `https://YOUR_VERCEL_URL.vercel.app`
- You should see the event appear

**Option B: Send a test webhook manually**

```bash
curl -X POST "https://YOUR_VERCEL_URL.vercel.app/api/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "action": {
      "id": 9999,
      "subject_id": 123,
      "subject_type": "Opportunity",
      "member_id": 1,
      "action_type": "update",
      "name": "Test Opportunity",
      "created_at": "2025-01-01T12:00:00.000Z",
      "updated_at": "2025-01-01T12:00:00.000Z",
      "member": {
        "id": 1,
        "name": "Test User"
      },
      "subject": {
        "id": 123,
        "name": "Test Opportunity",
        "organisation_name": "Test Customer",
        "opportunity_status": "reserved"
      }
    }
  }'
```

## Monitoring Your Deployment

### Vercel Dashboard
- **Logs**: View function logs in Vercel dashboard
- **Analytics**: Monitor function invocations and errors
- **Deployments**: Track deployment history

### Application Dashboard
- Visit `https://YOUR_VERCEL_URL.vercel.app`
- Monitor events in real-time
- Check health metrics
- View processing status

### Webhook Logs in Current RMS
Current RMS provides webhook logs showing:
- Request success/failure
- Response codes
- First 255 characters of responses
- Retry attempts

Access via API:
```bash
curl "https://api.current-rms.com/api/v1/webhook_logs?apikey=YOUR_API_KEY"
```

## Updating Your Deployment

### Automatic Deployments (GitHub Connected)
1. Push changes to your repository
2. Vercel automatically builds and deploys
3. No downtime during deployment

### Manual Deployments (Vercel CLI)
```bash
vercel --prod
```

## Environment Management

### Update Environment Variables
```bash
# Production
vercel env rm CURRENT_RMS_API_KEY production
vercel env add CURRENT_RMS_API_KEY production

# Preview
vercel env add CURRENT_RMS_API_KEY preview

# Development
vercel env add CURRENT_RMS_API_KEY development
```

### Pull Environment Variables Locally
```bash
vercel env pull .env.local
```

## Troubleshooting

### Issue: Webhooks not arriving

**Check 1: Webhook is registered**
```bash
curl "https://api.current-rms.com/api/v1/webhooks?apikey=YOUR_API_KEY"
```

**Check 2: URL is correct**
- Must be `https://` (not `http://`)
- Must be publicly accessible
- Should end with `/api/webhook`

**Check 3: Webhook is active**
```json
{
  "active": true  // Should be true
}
```

**Check 4: Function logs**
- Go to Vercel Dashboard → Your Project → Deployments → Functions
- Click on `/api/webhook` to see logs

### Issue: Dashboard shows no events

**Check 1: API routes are working**
```bash
curl "https://YOUR_VERCEL_URL.vercel.app/api/health"
```

**Check 2: Browser console**
- Open browser dev tools
- Check for JavaScript errors
- Verify network requests are succeeding

**Check 3: Auto-refresh**
- Ensure auto-refresh toggle is enabled
- Try manual refresh button

### Issue: Events processing but rules not executing

**Check business rules configuration**
- Open `lib/businessRules.ts`
- Ensure rule is enabled: `enabled: true`
- Verify trigger conditions match your events
- Check console output in Vercel function logs

### Issue: 500 errors in webhook endpoint

**Common causes:**
1. Missing environment variables
2. Invalid webhook payload format
3. Error in business rule execution

**Debug steps:**
1. Check Vercel function logs
2. Add console.log statements
3. Deploy and test again

## Performance Optimization

### Cold Starts
Vercel serverless functions may have cold starts. To minimize:
1. Keep functions lightweight
2. Use edge runtime for static content
3. Consider upgrading to Pro plan for better cold start performance

### Memory Usage
Monitor memory in Vercel dashboard. Adjust if needed:
```json
// vercel.json
{
  "functions": {
    "api/webhook.ts": {
      "memory": 1024
    }
  }
}
```

### Response Time
Webhook should respond within 30 seconds:
- Store event immediately
- Process rules asynchronously
- Return 200 OK quickly

## Security Best Practices

1. **Protect Dashboard**
   Add authentication for production:
   - Use Vercel Edge Middleware
   - Add basic auth
   - Use OAuth provider

2. **Verify Webhook Source**
   Add signature verification:
   ```typescript
   // In webhook handler
   const signature = req.headers['x-webhook-signature'];
   // Verify signature matches
   ```

3. **Rate Limiting**
   Consider adding rate limiting to prevent abuse:
   - Use Vercel Edge Config
   - Implement request throttling
   - Monitor unusual patterns

4. **Environment Variables**
   - Never commit `.env` files
   - Rotate API keys regularly
   - Use different keys for dev/prod

## Scaling Considerations

As your usage grows:

1. **Add Database**
   - Replace in-memory storage
   - Use Vercel Postgres, Supabase, or MongoDB

2. **Add Queue**
   - Process events asynchronously
   - Use Vercel KV or external queue (SQS, RabbitMQ)

3. **Add Caching**
   - Cache frequent lookups
   - Use Vercel Edge Config or Redis

4. **Monitor Costs**
   - Track function invocations
   - Monitor bandwidth
   - Consider upgrading plan if needed

## Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Current RMS API Docs**: https://api.current-rms.com/doc
- **Next.js Documentation**: https://nextjs.org/docs

## Rollback Procedure

If you need to rollback a deployment:

1. **Via Vercel Dashboard**
   - Go to Deployments
   - Find previous working deployment
   - Click "Promote to Production"

2. **Via Vercel CLI**
   ```bash
   vercel rollback
   ```
