# Current RMS API Quick Reference

## Authentication Format

Current RMS API uses **header-based authentication**, not query parameters.

### Required Headers

```bash
--header "X-SUBDOMAIN: your-subdomain"
--header "X-AUTH-TOKEN: your-api-key"
```

**Finding Your Subdomain:**
- If your Current RMS URL is `mycompany.current-rms.com`
- Your subdomain is `mycompany`

**Finding Your API Key:**
- Log into Current RMS
- Go to **System Setup > Integrations > API**
- Generate or copy your API key

---

## Webhook Management

### 1. List All Webhooks

```bash
curl "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key"
```

### 2. Create a Webhook

```bash
curl -X POST "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key" \
  --header "Content-Type: application/json" \
  -d '{
    "webhook": {
      "name": "My Webhook Name",
      "event": "opportunity_update",
      "target_url": "https://your-app.vercel.app/api/webhook",
      "active": true
    }
  }'
```

### 3. Get Specific Webhook

```bash
curl "https://api.current-rms.com/api/v1/webhooks/{webhook_id}" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key"
```

### 4. Update a Webhook

```bash
curl -X PUT "https://api.current-rms.com/api/v1/webhooks/{webhook_id}" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key" \
  --header "Content-Type: application/json" \
  -d '{
    "webhook": {
      "active": false
    }
  }'
```

### 5. Delete a Webhook

```bash
curl -X DELETE "https://api.current-rms.com/api/v1/webhooks/{webhook_id}" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key"
```

### 6. View Webhook Logs

```bash
curl "https://api.current-rms.com/api/v1/webhook_logs" \
  --header "X-SUBDOMAIN: your-subdomain" \
  --header "X-AUTH-TOKEN: your-api-key"
```

---

## Common Opportunity Events

Use these values for the `event` field when creating webhooks:

### Generic Actions
- `opportunity_create` - New opportunity created
- `opportunity_update` - Opportunity updated (any change)
- `opportunity_destroy` - Opportunity deleted

### Status Changes
- `opportunity_convert_to_order` - Converted to order
- `opportunity_convert_to_quotation` - Converted to quotation
- `opportunity_mark_as_provisional` - Marked as provisional
- `opportunity_mark_as_reserved` - Marked as reserved
- `opportunity_mark_as_lost` - Marked as lost
- `opportunity_mark_as_dead` - Marked as dead

### Workflow Actions
- `opportunity_allocate` - Inventory allocated
- `opportunity_prepare` - Items prepared
- `opportunity_book_out` - Items booked out
- `opportunity_check_in` - Items checked in
- `opportunity_cancel` - Opportunity cancelled
- `opportunity_complete` - Opportunity completed
- `opportunity_confirm` - Opportunity confirmed

### Item Management
- `opportunity_create_item` - Item added to opportunity
- `opportunity_update_item` - Item updated on opportunity
- `opportunity_destroy_item` - Item removed from opportunity

---

## Using the Management Script

This repository includes `manage-webhooks.sh` for easier webhook management.

### Setup

```bash
# Make executable (if not already)
chmod +x manage-webhooks.sh

# Set environment variables
export CURRENT_RMS_SUBDOMAIN=your-subdomain
export CURRENT_RMS_API_KEY=your-api-key

# OR create a .env file
echo "CURRENT_RMS_SUBDOMAIN=your-subdomain" > .env
echo "CURRENT_RMS_API_KEY=your-api-key" >> .env
```

### Commands

```bash
# List all webhooks
./manage-webhooks.sh list

# Create a webhook
./manage-webhooks.sh create opportunity_update https://your-app.vercel.app/api/webhook

# Delete a webhook
./manage-webhooks.sh delete 123

# View webhook logs
./manage-webhooks.sh logs
```

---

## Example: Complete Setup

```bash
# 1. Set your credentials
export CURRENT_RMS_SUBDOMAIN=mycompany
export CURRENT_RMS_API_KEY=abc123xyz789

# 2. Create webhooks for your deployed app
YOUR_APP_URL="https://my-watcher.vercel.app/api/webhook"

# General updates
curl -X POST "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: $CURRENT_RMS_SUBDOMAIN" \
  --header "X-AUTH-TOKEN: $CURRENT_RMS_API_KEY" \
  --header "Content-Type: application/json" \
  -d "{
    \"webhook\": {
      \"name\": \"Watcher - All Updates\",
      \"event\": \"opportunity_update\",
      \"target_url\": \"$YOUR_APP_URL\",
      \"active\": true
    }
  }"

# Convert to order
curl -X POST "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: $CURRENT_RMS_SUBDOMAIN" \
  --header "X-AUTH-TOKEN: $CURRENT_RMS_API_KEY" \
  --header "Content-Type: application/json" \
  -d "{
    \"webhook\": {
      \"name\": \"Watcher - Convert to Order\",
      \"event\": \"opportunity_convert_to_order\",
      \"target_url\": \"$YOUR_APP_URL\",
      \"active\": true
    }
  }"

# Mark as reserved
curl -X POST "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: $CURRENT_RMS_SUBDOMAIN" \
  --header "X-AUTH-TOKEN: $CURRENT_RMS_API_KEY" \
  --header "Content-Type: application/json" \
  -d "{
    \"webhook\": {
      \"name\": \"Watcher - Mark Reserved\",
      \"event\": \"opportunity_mark_as_reserved\",
      \"target_url\": \"$YOUR_APP_URL\",
      \"active\": true
    }
  }"

# 3. Verify webhooks were created
curl "https://api.current-rms.com/api/v1/webhooks" \
  --header "X-SUBDOMAIN: $CURRENT_RMS_SUBDOMAIN" \
  --header "X-AUTH-TOKEN: $CURRENT_RMS_API_KEY"
```

---

## Troubleshooting

### 401 Unauthorized
- Check your subdomain is correct (no `.current-rms.com` suffix)
- Verify your API key is active
- Ensure headers are spelled correctly: `X-SUBDOMAIN` and `X-AUTH-TOKEN`

### 404 Not Found
- Verify the endpoint URL is correct
- Check the webhook ID exists (for update/delete operations)

### Webhook Not Triggering
- Verify webhook is active: `"active": true`
- Check the event type matches the action
- Review webhook logs for delivery failures
- Ensure target URL is publicly accessible via HTTPS

---

## API Documentation

For complete API documentation, visit:
- https://api.current-rms.com/doc
- https://documenter.getpostman.com/view/4811107/SzS5wSad

Or access from within Current RMS:
- **System Setup > Integrations > API**
