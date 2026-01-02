#!/bin/bash

# Current RMS Webhook Management Script
# Simplifies webhook creation, listing, and deletion

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUBDOMAIN="${CURRENT_RMS_SUBDOMAIN:-}"
API_KEY="${CURRENT_RMS_API_KEY:-}"

# Function to display usage
usage() {
    echo -e "${BLUE}Current RMS Webhook Management Script${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  list                      List all webhooks"
    echo "  create <event> <url>      Create a new webhook"
    echo "  delete <webhook_id>       Delete a webhook"
    echo "  logs                      View webhook logs"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 create opportunity_update https://your-app.vercel.app/api/webhook"
    echo "  $0 delete 123"
    echo ""
    echo "Environment Variables:"
    echo "  CURRENT_RMS_SUBDOMAIN     Your Current RMS subdomain"
    echo "  CURRENT_RMS_API_KEY       Your API key"
    echo ""
    exit 1
}

# Check if credentials are set
check_credentials() {
    if [ -z "$SUBDOMAIN" ] || [ -z "$API_KEY" ]; then
        echo -e "${RED}Error: Missing credentials${NC}"
        echo ""
        echo "Please set environment variables:"
        echo "  export CURRENT_RMS_SUBDOMAIN=your-subdomain"
        echo "  export CURRENT_RMS_API_KEY=your-api-key"
        echo ""
        echo "Or create a .env file with:"
        echo "  CURRENT_RMS_SUBDOMAIN=your-subdomain"
        echo "  CURRENT_RMS_API_KEY=your-api-key"
        exit 1
    fi
}

# Load .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    SUBDOMAIN="${CURRENT_RMS_SUBDOMAIN:-}"
    API_KEY="${CURRENT_RMS_API_KEY:-}"
fi

# List all webhooks
list_webhooks() {
    echo -e "${BLUE}Fetching webhooks...${NC}"
    
    response=$(curl -s "https://api.current-rms.com/api/v1/webhooks" \
        --header "X-SUBDOMAIN: $SUBDOMAIN" \
        --header "X-AUTH-TOKEN: $API_KEY")
    
    echo "$response" | jq '.' || echo "$response"
}

# Create a webhook
create_webhook() {
    local event=$1
    local target_url=$2
    
    if [ -z "$event" ] || [ -z "$target_url" ]; then
        echo -e "${RED}Error: Event and target URL are required${NC}"
        echo "Usage: $0 create <event> <target_url>"
        exit 1
    fi
    
    # Generate a name based on the event
    local name="Watcher - ${event}"
    
    echo -e "${BLUE}Creating webhook...${NC}"
    echo "  Event: $event"
    echo "  URL: $target_url"
    echo ""
    
    response=$(curl -s -X POST "https://api.current-rms.com/api/v1/webhooks" \
        --header "X-SUBDOMAIN: $SUBDOMAIN" \
        --header "X-AUTH-TOKEN: $API_KEY" \
        --header "Content-Type: application/json" \
        -d "{
            \"webhook\": {
                \"name\": \"$name\",
                \"event\": \"$event\",
                \"target_url\": \"$target_url\",
                \"active\": true
            }
        }")
    
    echo "$response" | jq '.' || echo "$response"
    
    if echo "$response" | jq -e '.webhook.id' > /dev/null 2>&1; then
        webhook_id=$(echo "$response" | jq -r '.webhook.id')
        echo ""
        echo -e "${GREEN}✓ Webhook created successfully!${NC}"
        echo "  ID: $webhook_id"
    else
        echo ""
        echo -e "${RED}✗ Failed to create webhook${NC}"
    fi
}

# Delete a webhook
delete_webhook() {
    local webhook_id=$1
    
    if [ -z "$webhook_id" ]; then
        echo -e "${RED}Error: Webhook ID is required${NC}"
        echo "Usage: $0 delete <webhook_id>"
        exit 1
    fi
    
    echo -e "${YELLOW}Deleting webhook $webhook_id...${NC}"
    
    response=$(curl -s -X DELETE "https://api.current-rms.com/api/v1/webhooks/$webhook_id" \
        --header "X-SUBDOMAIN: $SUBDOMAIN" \
        --header "X-AUTH-TOKEN: $API_KEY")
    
    if [ -z "$response" ] || [ "$response" = "{}" ]; then
        echo -e "${GREEN}✓ Webhook deleted successfully${NC}"
    else
        echo "$response" | jq '.' || echo "$response"
    fi
}

# View webhook logs
view_logs() {
    echo -e "${BLUE}Fetching webhook logs...${NC}"
    
    response=$(curl -s "https://api.current-rms.com/api/v1/webhook_logs" \
        --header "X-SUBDOMAIN: $SUBDOMAIN" \
        --header "X-AUTH-TOKEN: $API_KEY")
    
    echo "$response" | jq '.' || echo "$response"
}

# Main script logic
case "${1:-}" in
    list)
        check_credentials
        list_webhooks
        ;;
    create)
        check_credentials
        create_webhook "$2" "$3"
        ;;
    delete)
        check_credentials
        delete_webhook "$2"
        ;;
    logs)
        check_credentials
        view_logs
        ;;
    *)
        usage
        ;;
esac
