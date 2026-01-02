# Why Automatic Webhook Setup is Better

## The Old Way ❌

### Step 1: Deploy Application
```bash
vercel deploy
```

### Step 2: Get Deployment URL
Wait for deployment, note URL: `https://my-app.vercel.app`

### Step 3: Manually Create Webhooks (13 times!)
```bash
# Webhook 1
curl -X POST "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: mycompany" \
  --header "X-AUTH-TOKEN: abc123..." \
  --header "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Watcher - General Updates",
      "event": "opportunity_update",
      "target_url": "https://my-app.vercel.app/api/webhook",
      "active": true
    }
  }'

# Webhook 2
curl -X POST "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: mycompany" \
  --header "X-AUTH-TOKEN: abc123..." \
  --header "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "Watcher - Convert to Order",
      "event": "opportunity_convert_to_order",
      "target_url": "https://my-app.vercel.app/api/webhook",
      "active": true
    }
  }'

# ... repeat 11 more times 😫
```

### Step 4: Verify Each Webhook
```bash
curl "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: mycompany" \
  --header "X-AUTH-TOKEN: abc123..."
```

### Step 5: Fix Typos/Mistakes
If you made a typo in the URL or event name, delete and recreate:
```bash
curl -X DELETE "https://api.current-rms.com/api/v1/webhooks/123" \
  --header "X-SUBDOMAIN: mycompany" \
  --header "X-AUTH-TOKEN: abc123..."
# Then create again...
```

**Time Required:** 15-30 minutes  
**Error Prone:** High (manual typing, copy/paste errors)  
**Repeatable:** No (must do manually every time)

---

## The New Way ✅

### Step 1: Set Environment Variables (Once)
In Vercel Dashboard → Settings → Environment Variables:
- `CURRENT_RMS_SUBDOMAIN` = `mycompany`
- `CURRENT_RMS_API_KEY` = `abc123...`

### Step 2: Deploy
```bash
git push
```
or
```bash
vercel deploy --prod
```

### Step 3: Watch the Magic
During deployment, the build output shows:
```
▲ Vercel CLI 50.1.3
Running "npm run build"

> current-rms-watcher@1.0.0 build
> next build

✓ Creating an optimized production build
✓ Compiled successfully

> current-rms-watcher@1.0.0 postbuild
> node scripts/setup-webhooks-auto.js

🔧 Starting automatic webhook setup...

📋 Configuration:
   Subdomain: mycompany
   Target URL: https://my-app.vercel.app/api/webhook
   Environment: Production

🔍 Checking existing webhooks...
   Found 25 existing webhooks

➕ Creating: Watcher - General Updates
   ✅ Created (ID: 44)
➕ Creating: Watcher - Convert to Order
   ✅ Created (ID: 45)
➕ Creating: Watcher - Convert to Quotation
   ✅ Created (ID: 46)
➕ Creating: Watcher - Mark as Provisional
   ✅ Created (ID: 47)
➕ Creating: Watcher - Mark as Reserved
   ✅ Created (ID: 48)
➕ Creating: Watcher - Mark as Lost
   ✅ Created (ID: 49)
➕ Creating: Watcher - Mark as Dead
   ✅ Created (ID: 50)
➕ Creating: Watcher - Cancel
   ✅ Created (ID: 51)
➕ Creating: Watcher - Complete
   ✅ Created (ID: 52)
➕ Creating: Watcher - Confirm
   ✅ Created (ID: 53)
➕ Creating: Watcher - Create Item
   ✅ Created (ID: 54)
➕ Creating: Watcher - Update Item
   ✅ Created (ID: 55)
➕ Creating: Watcher - Destroy Item
   ✅ Created (ID: 56)

==================================================
📊 Webhook Setup Summary:
==================================================
   ✅ Created: 13
   🔄 Updated: 0
   ⏭️  Skipped: 0
   ❌ Failed: 0
==================================================

🎉 Webhook setup complete!
   Your watcher is now monitoring: https://my-app.vercel.app/api/webhook

✓ Build completed
```

**Time Required:** 0 minutes (automated)  
**Error Prone:** Low (no manual input)  
**Repeatable:** Yes (works every deployment)

---

## Key Benefits

### 1. Zero Manual Configuration
- No curl commands to type
- No webhook IDs to track
- No manual verification needed

### 2. Automatic Updates
When you redeploy:
- Existing webhooks are detected and preserved
- URL changes are automatically updated
- No duplicates created

### 3. Self-Documenting
The build logs show exactly what was created:
```
✅ Created (ID: 44)  ← Can reference this if needed
```

### 4. Idempotent
Safe to run multiple times:
- First deployment: Creates webhooks
- Subsequent deployments: Skips existing, updates if needed
- No cleanup required

### 5. Environment-Aware
Automatically uses the correct URL:
- Production: `https://my-app.vercel.app`
- Preview: `https://my-app-git-feature.vercel.app`
- Local: Skips (no webhooks needed for local dev)

### 6. Error Handling
If webhook creation fails:
- Shows clear error message
- Continues with other webhooks
- Provides summary of what succeeded/failed

---

## Real-World Scenarios

### Scenario 1: First Deployment
**Old Way:**
1. Deploy → 3 minutes
2. Note URL → 30 seconds
3. Create 13 webhooks → 15 minutes
4. Test → 5 minutes
**Total: ~23 minutes**

**New Way:**
1. Deploy (includes webhook setup) → 3 minutes
2. Test → 1 minute
**Total: ~4 minutes**

**Time Saved: 19 minutes** ⏱️

---

### Scenario 2: Redeployment (Bug Fix)
**Old Way:**
1. Deploy → 3 minutes
2. Check if URL changed → 2 minutes
3. Update webhooks if needed → 5-15 minutes
**Total: ~10-20 minutes**

**New Way:**
1. Deploy (auto-updates webhooks) → 3 minutes
**Total: ~3 minutes**

**Time Saved: 7-17 minutes** ⏱️

---

### Scenario 3: Team Member Deploys
**Old Way:**
1. Deploy → 3 minutes
2. Ask: "How do I set up webhooks?" → 5 minutes
3. Follow manual instructions → 20 minutes
4. Troubleshoot issues → 10 minutes
**Total: ~38 minutes**

**New Way:**
1. Deploy → 3 minutes
2. Done (webhooks auto-created)
**Total: ~3 minutes**

**Time Saved: 35 minutes** ⏱️

---

## Technical Implementation

### How It Works

The `package.json` includes a postbuild script:
```json
{
  "scripts": {
    "postbuild": "node scripts/setup-webhooks-auto.js"
  }
}
```

This runs automatically after Next.js builds, before deployment completes.

### The Script Does:

1. **Validates Environment**
   - Checks for required variables
   - Gets Vercel URL from environment

2. **Fetches Existing Webhooks**
   - Calls Current RMS API
   - Identifies "Watcher" webhooks

3. **Creates/Updates as Needed**
   - Creates missing webhooks
   - Updates URLs if changed
   - Skips existing webhooks

4. **Reports Results**
   - Shows summary in build logs
   - Returns success/failure

### Smart Logic

```javascript
// Check if webhook exists
const existing = existingWebhooks.find(w => 
  w.name === webhookName && w.event === event
);

if (existing) {
  if (existing.target_url !== targetUrl) {
    // URL changed, update it
    updateWebhook(existing.id, targetUrl);
  } else {
    // Already correct, skip
    console.log('⏭️  Skipping: already configured');
  }
} else {
  // Doesn't exist, create it
  createWebhook(event, description, targetUrl);
}
```

---

## Fallback Options

If automatic setup fails, you can still use:

### Option 1: Setup Script
```bash
./setup-webhooks.sh
```
Interactive script that creates webhooks.

### Option 2: Management Script
```bash
./manage-webhooks.sh create opportunity_update https://your-app.vercel.app/api/webhook
```
Granular control over individual webhooks.

### Option 3: Manual cURL
See API_REFERENCE.md for commands.

---

## Configuration

### Customize Webhooks

Edit `scripts/setup-webhooks-auto.js`:

```javascript
const REQUIRED_WEBHOOKS = [
  { event: 'opportunity_update', description: 'General Updates' },
  // Add your custom events here
  { event: 'opportunity_allocate', description: 'Allocate' },
  { event: 'opportunity_book_out', description: 'Book Out' },
];
```

### Disable for Preview Deployments

Add environment check:
```javascript
// Skip preview deployments
if (process.env.VERCEL_ENV === 'preview') {
  console.log('Preview deployment - skipping webhook setup');
  process.exit(0);
}
```

### Add Retry Logic

```javascript
async function createWebhookWithRetry(event, description, targetUrl, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const result = await createWebhook(event, description, targetUrl);
    if (result && result.statusCode === 201) {
      return result;
    }
    await sleep(1000 * (i + 1)); // Exponential backoff
  }
  return null;
}
```

---

## Comparison Summary

| Feature | Manual Setup | Automatic Setup |
|---------|-------------|-----------------|
| Time Required | 15-30 min | 0 min |
| Error Prone | High | Low |
| Repeatable | No | Yes |
| Team Friendly | No | Yes |
| Self-Documenting | No | Yes |
| Handles Updates | Manual | Automatic |
| Handles Duplicates | Manual cleanup | Prevented |
| Build Integration | No | Yes |
| Visible in Logs | No | Yes |

---

## Conclusion

Automatic webhook setup is:
- ⚡ **Faster** - 0 manual steps
- 🎯 **More Reliable** - No typos or missed webhooks
- 🔄 **Repeatable** - Works every deployment
- 👥 **Team Friendly** - No tribal knowledge needed
- 📊 **Transparent** - Shows exactly what was created

**Result:** You can focus on building features instead of managing webhooks! 🚀
