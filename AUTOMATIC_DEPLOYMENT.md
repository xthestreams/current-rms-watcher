# Automatic Deployment Guide

## ✨ Automatic Webhook Setup

This application now **automatically creates webhooks** during Vercel deployment! No manual setup required.

## How It Works

When you deploy to Vercel:

1. **Build Process Runs** → Next.js builds your application
2. **Post-Build Hook Triggers** → `scripts/setup-webhooks-auto.js` runs automatically
3. **Webhooks Created** → Script creates/updates all required webhooks
4. **Ready to Go** → Your watcher is immediately monitoring Current RMS

All you need to do is **set environment variables** in Vercel.

---

## Quick Deploy (3 Steps)

### Step 1: Deploy to Vercel

**Option A: GitHub (Recommended)**

1. Push code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/current-rms-watcher.git
git push -u origin main
```

2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel auto-detects Next.js settings

**Option B: Vercel CLI**

```bash
npm i -g vercel
vercel
```

### Step 2: Set Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `CURRENT_RMS_SUBDOMAIN` | `your-subdomain` | e.g., `mycompany` (without .current-rms.com) |
| `CURRENT_RMS_API_KEY` | `your-api-key` | From System Setup > Integrations > API |

**Important:** Set these for **Production**, **Preview**, and **Development** environments.

### Step 3: Deploy

Click **Deploy** and watch the magic happen!

The build logs will show:
```
🔧 Starting automatic webhook setup...
📋 Configuration:
   Subdomain: your-subdomain
   Target URL: https://your-app.vercel.app/api/webhook
   
➕ Creating: Watcher - General Updates
   ✅ Created (ID: 123)
➕ Creating: Watcher - Convert to Order
   ✅ Created (ID: 124)
...

📊 Webhook Setup Summary:
   ✅ Created: 13
   🔄 Updated: 0
   ⏭️  Skipped: 0
   ❌ Failed: 0

🎉 Webhook setup complete!
```

That's it! Your watcher is now live and monitoring.

---

## What Gets Created

The deployment automatically creates 13 webhooks:

| Webhook | Event | Purpose |
|---------|-------|---------|
| Watcher - General Updates | `opportunity_update` | All opportunity changes |
| Watcher - Convert to Order | `opportunity_convert_to_order` | Quote → Order |
| Watcher - Convert to Quotation | `opportunity_convert_to_quotation` | Draft → Quote |
| Watcher - Mark as Provisional | `opportunity_mark_as_provisional` | Provisional status |
| Watcher - Mark as Reserved | `opportunity_mark_as_reserved` | Reserved status |
| Watcher - Mark as Lost | `opportunity_mark_as_lost` | Lost opportunities |
| Watcher - Mark as Dead | `opportunity_mark_as_dead` | Dead opportunities |
| Watcher - Cancel | `opportunity_cancel` | Cancellations |
| Watcher - Complete | `opportunity_complete` | Completions |
| Watcher - Confirm | `opportunity_confirm` | Confirmations |
| Watcher - Create Item | `opportunity_create_item` | Items added |
| Watcher - Update Item | `opportunity_update_item` | Items changed |
| Watcher - Destroy Item | `opportunity_destroy_item` | Items removed |

---

## Updating Your Deployment

### When You Push New Code

Webhooks are **smart** - they won't create duplicates:

- **First deployment**: Creates all webhooks
- **Subsequent deployments**: Updates URLs if they changed, skips existing webhooks
- **Preview deployments**: Can create separate preview webhooks (if you want)

### To Update Environment Variables

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Update the value
3. Redeploy (or wait for next commit)

---

## Verifying Setup

### 1. Check Build Logs

In Vercel Dashboard:
- Go to your deployment
- Click "View Function Logs" or "Build Logs"
- Look for webhook setup output

### 2. List Webhooks via API

```bash
curl "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key" \
  | grep "Watcher"
```

Or use the management script:
```bash
./manage-webhooks.sh list | grep Watcher
```

### 3. Test the Dashboard

Visit `https://your-app.vercel.app` and you should see:
- Health dashboard loaded
- Metrics showing (0 events initially)
- Auto-refresh enabled

### 4. Real Test

1. Go to Current RMS
2. Update any opportunity (change date, add note, anything)
3. Watch the event appear in your dashboard!

---

## Troubleshooting

### Build Succeeds But No Webhooks Created

**Possible causes:**

1. **Environment variables not set**
   - Check Vercel Dashboard → Settings → Environment Variables
   - Must be set for the deployment environment (Production/Preview/Development)

2. **VERCEL_URL not available**
   - First preview/production deployment creates the URL
   - Redeploy and webhooks will be created

3. **API credentials incorrect**
   - Verify subdomain (no `.current-rms.com` suffix)
   - Test credentials manually:
   ```bash
   curl "https://api.current-rms.com/api/v1/webhooks" \
     --header "X-SUBDOMAIN: your-subdomain" \
     --header "X-AUTH-TOKEN: your-api-key"
   ```

**Solution:** Check build logs in Vercel for specific error messages.

### Webhooks Created But Not Receiving Events

1. **Check webhook is active**
   - List webhooks and verify `"active": true`

2. **Verify target URL**
   - Should be `https://your-app.vercel.app/api/webhook`
   - Must be HTTPS (not HTTP)

3. **Test webhook endpoint**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```
   Should return healthy status.

4. **Check Current RMS webhook logs**
   ```bash
   ./manage-webhooks.sh logs
   ```
   Look for delivery failures or error responses.

### Want to Recreate All Webhooks?

1. Delete existing "Watcher" webhooks:
   ```bash
   # List webhooks and note IDs
   ./manage-webhooks.sh list | grep Watcher
   
   # Delete each one
   ./manage-webhooks.sh delete <webhook_id>
   ```

2. Redeploy in Vercel (or push new commit)

3. Webhooks will be recreated automatically

---

## Manual Webhook Setup (Fallback)

If automatic setup fails, you can still set up manually:

### Option 1: Use Setup Script

```bash
export CURRENT_RMS_SUBDOMAIN=your-subdomain
export CURRENT_RMS_API_KEY=your-api-key
./setup-webhooks.sh
```

### Option 2: Individual Creation

```bash
curl -X POST "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key" \
  --header "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Watcher - General Updates",
      "event": "opportunity_update",
      "target_url": "https://your-app.vercel.app/api/webhook",
      "active": true
    }
  }'
```

---

## Preview Deployments

### How Preview Deployments Work

Vercel creates a unique URL for each branch/PR:
- `https://current-rms-watcher-git-feature-user.vercel.app`

### Preview Deployment Behavior

By default, the automatic webhook setup:
- **Skips preview deployments** (to avoid creating too many webhooks)
- **Only runs on production deployments**

### To Enable Preview Webhooks

Edit `scripts/setup-webhooks-auto.js`:

```javascript
// Change this line
if (!config.vercelUrl) {
  console.log('⚠️  No VERCEL_URL detected. Skipping webhook setup.');
  process.exit(0);
}

// To this (to enable for all deployments)
if (!config.vercelUrl) {
  console.log('⚠️  No VERCEL_URL detected. Skipping webhook setup.');
  process.exit(0);
}
// Remove the production-only check
```

**Note:** This will create webhooks for every preview deployment. Clean them up periodically.

---

## Advanced Configuration

### Custom Webhook Events

Edit `scripts/setup-webhooks-auto.js` to add more events:

```javascript
const REQUIRED_WEBHOOKS = [
  // Add your custom events here
  { event: 'opportunity_allocate', description: 'Allocate' },
  { event: 'opportunity_book_out', description: 'Book Out' },
  // ... existing events
];
```

### Skip Automatic Setup

To disable automatic webhook creation:

1. Remove from `package.json`:
```json
"scripts": {
  "postbuild": "node scripts/setup-webhooks-auto.js",  // Delete this line
}
```

2. Or set an environment variable:
```
SKIP_WEBHOOK_SETUP=true
```

And check for it in the script.

---

## Security Best Practices

### 1. Protect Environment Variables
- Never commit `.env` files
- Use Vercel's environment variable encryption
- Rotate API keys periodically

### 2. Webhook Verification
For production, add signature verification in `/api/webhook.ts`:

```typescript
const signature = req.headers['x-webhook-signature'];
// Verify signature matches expected value
```

### 3. Rate Limiting
Consider adding rate limiting to webhook endpoint:
```typescript
// In /api/webhook.ts
import rateLimit from 'express-rate-limit';
```

### 4. Monitor Failed Requests
Set up alerts for webhook failures:
- Use Vercel Analytics
- Monitor function error rates
- Check Current RMS webhook logs

---

## Cost Considerations

### Vercel Free Tier

The free tier includes:
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ 100 GB-hours serverless function execution
- ✅ Automatic HTTPS

**For typical webhook usage:** Free tier is more than enough.

### Scaling Considerations

If you process **1000+ webhooks/day**:
- Consider upgrading to Pro ($20/month)
- Add database for persistent storage
- Implement caching

---

## Next Steps

Once deployed:

1. ✅ **Test the dashboard** → Visit your Vercel URL
2. ✅ **Make a change in Current RMS** → Watch event appear
3. ✅ **Customize business rules** → Edit `lib/businessRules.ts`
4. ✅ **Add integrations** → Email, Slack, CRM, etc.
5. ✅ **Set up monitoring** → Sentry, LogRocket, etc.

---

## Support Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Current RMS API**: https://api.current-rms.com/doc
- **Webhook Troubleshooting**: See QUICK_START.md

Happy monitoring! 🎉
