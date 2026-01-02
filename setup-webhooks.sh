#!/bin/bash

# Setup Script for Current RMS Watcher
# This script registers all necessary webhooks for your Vercel deployment

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Current RMS Watcher - Setup Script       ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo ""

# Check for required environment variables
if [ -z "$CURRENT_RMS_SUBDOMAIN" ] || [ -z "$CURRENT_RMS_API_KEY" ]; then
    echo -e "${RED}Error: Missing credentials${NC}"
    echo ""
    echo "Please set environment variables:"
    echo "  export CURRENT_RMS_SUBDOMAIN=your-subdomain"
    echo "  export CURRENT_RMS_API_KEY=your-api-key"
    echo ""
    exit 1
fi

# Prompt for Vercel URL
echo -e "${YELLOW}Enter your Vercel app URL (without /api/webhook):${NC}"
echo -e "${YELLOW}Example: https://my-watcher.vercel.app${NC}"
read -p "> " VERCEL_URL

if [ -z "$VERCEL_URL" ]; then
    echo -e "${RED}Error: Vercel URL is required${NC}"
    exit 1
fi

# Remove trailing slash if present
VERCEL_URL="${VERCEL_URL%/}"
WEBHOOK_URL="${VERCEL_URL}/api/webhook"

echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Subdomain: $CURRENT_RMS_SUBDOMAIN"
echo "  Webhook URL: $WEBHOOK_URL"
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

echo ""
echo -e "${BLUE}Creating webhooks...${NC}"
echo ""

# Array of webhooks to create
declare -a webhooks=(
    "opportunity_update:General Updates"
    "opportunity_convert_to_order:Convert to Order"
    "opportunity_convert_to_quotation:Convert to Quotation"
    "opportunity_mark_as_provisional:Mark as Provisional"
    "opportunity_mark_as_reserved:Mark as Reserved"
    "opportunity_mark_as_lost:Mark as Lost"
    "opportunity_mark_as_dead:Mark as Dead"
    "opportunity_cancel:Cancel"
    "opportunity_complete:Complete"
    "opportunity_confirm:Confirm"
    "opportunity_create_item:Create Item"
    "opportunity_update_item:Update Item"
    "opportunity_destroy_item:Destroy Item"
)

# Counter for success/failure
success_count=0
failure_count=0

# Create each webhook
for webhook in "${webhooks[@]}"; do
    IFS=':' read -r event description <<< "$webhook"
    name="Watcher - $description"
    
    echo -e "${YELLOW}Creating:${NC} $name ($event)"
    
    response=$(curl -s -X POST "https://api.current-rms.com/api/v1/webhooks" \
        --header "X-SUBDOMAIN: $CURRENT_RMS_SUBDOMAIN" \
        --header "X-AUTH-TOKEN: $CURRENT_RMS_API_KEY" \
        --header "Content-Type: application/json" \
        -d "{
            \"webhook\": {
                \"name\": \"$name\",
                \"event\": \"$event\",
                \"target_url\": \"$WEBHOOK_URL\",
                \"active\": true
            }
        }")
    
    # Check if webhook was created successfully
    if echo "$response" | grep -q '"id"'; then
        webhook_id=$(echo "$response" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
        echo -e "  ${GREEN}✓ Created${NC} (ID: $webhook_id)"
        ((success_count++))
    else
        echo -e "  ${RED}✗ Failed${NC}"
        echo "$response" | head -c 200
        echo ""
        ((failure_count++))
    fi
    
    # Small delay to avoid rate limiting
    sleep 0.5
done

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}Setup Complete!${NC}"
echo ""
echo "  Webhooks created: $success_count"
echo "  Failed: $failure_count"
echo ""

if [ $success_count -gt 0 ]; then
    echo -e "${GREEN}✓ Your watcher is now monitoring Current RMS!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Visit your dashboard: $VERCEL_URL"
    echo "  2. Make a change to an opportunity in Current RMS"
    echo "  3. Watch the event appear in your dashboard!"
    echo ""
fi

# Verify webhooks
echo "To verify your webhooks, run:"
echo "  ./manage-webhooks.sh list | grep Watcher"
echo ""
