#!/usr/bin/env node

/**
 * Test Webhook Script
 * Simulates Current RMS webhook calls for testing
 * 
 * Usage:
 *   node test-webhook.js [url] [event-type]
 * 
 * Examples:
 *   node test-webhook.js http://localhost:3000/api/webhook update
 *   node test-webhook.js https://your-app.vercel.app/api/webhook convert_to_order
 */

const https = require('https');
const http = require('http');

// Parse command line arguments
const args = process.argv.slice(2);
const targetUrl = args[0] || 'http://localhost:3000/api/webhook';
const eventType = args[1] || 'update';

// Sample webhook payloads for different event types
const samplePayloads = {
  update: {
    action: {
      id: Math.floor(Math.random() * 10000),
      subject_id: 101,
      subject_type: 'Opportunity',
      member_id: 5,
      action_type: 'update',
      name: 'Summer Festival Equipment Rental',
      description: 'Updated opportunity details',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member: {
        id: 5,
        name: 'John Smith',
        email: 'john.smith@example.com'
      },
      subject: {
        id: 101,
        name: 'Summer Festival Equipment Rental',
        organisation_name: 'ABC Events Ltd',
        opportunity_status: 'provisional',
        user_id: 5,
        created_at: '2025-01-01T10:00:00.000Z',
        updated_at: new Date().toISOString()
      }
    }
  },
  
  convert_to_order: {
    action: {
      id: Math.floor(Math.random() * 10000),
      subject_id: 102,
      subject_type: 'Opportunity',
      member_id: 3,
      action_type: 'convert_to_order',
      name: 'Corporate Conference AV Package',
      description: 'Converted opportunity to order',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member: {
        id: 3,
        name: 'Sarah Johnson',
        email: 'sarah.j@example.com'
      },
      subject: {
        id: 102,
        name: 'Corporate Conference AV Package',
        organisation_name: 'TechCorp Industries',
        opportunity_status: 'order',
        user_id: 3,
        created_at: '2025-01-05T09:00:00.000Z',
        updated_at: new Date().toISOString()
      }
    }
  },
  
  mark_as_reserved: {
    action: {
      id: Math.floor(Math.random() * 10000),
      subject_id: 103,
      subject_type: 'Opportunity',
      member_id: 7,
      action_type: 'mark_as_reserved',
      name: 'Wedding Reception Equipment',
      description: 'Marked opportunity as reserved',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member: {
        id: 7,
        name: 'Mike Davis',
        email: 'mike.davis@example.com'
      },
      subject: {
        id: 103,
        name: 'Wedding Reception Equipment',
        organisation_name: 'Perfect Day Weddings',
        opportunity_status: 'reserved',
        user_id: 7,
        created_at: '2025-01-10T14:00:00.000Z',
        updated_at: new Date().toISOString()
      }
    }
  },
  
  mark_as_lost: {
    action: {
      id: Math.floor(Math.random() * 10000),
      subject_id: 104,
      subject_type: 'Opportunity',
      member_id: 2,
      action_type: 'mark_as_lost',
      name: 'Concert Sound System',
      description: 'Lost to competitor',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member: {
        id: 2,
        name: 'Emily Chen',
        email: 'emily.chen@example.com'
      },
      subject: {
        id: 104,
        name: 'Concert Sound System',
        organisation_name: 'Live Music Promotions',
        opportunity_status: 'lost',
        user_id: 2,
        created_at: '2025-01-08T11:00:00.000Z',
        updated_at: new Date().toISOString()
      }
    }
  },
  
  create_item: {
    action: {
      id: Math.floor(Math.random() * 10000),
      subject_id: 105,
      subject_type: 'Opportunity',
      source_id: 5001,
      source_type: 'OpportunityItem',
      member_id: 4,
      action_type: 'create_item',
      name: 'Theater Production Equipment',
      description: 'Added lighting package',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      member: {
        id: 4,
        name: 'Robert Taylor',
        email: 'robert.taylor@example.com'
      },
      subject: {
        id: 105,
        name: 'Theater Production Equipment',
        organisation_name: 'Broadway Theater Company',
        opportunity_status: 'quotation',
        user_id: 4,
        created_at: '2025-01-12T16:00:00.000Z',
        updated_at: new Date().toISOString()
      },
      source: {
        id: 5001,
        item_type: 'Product',
        item_name: 'LED Stage Lighting Package'
      }
    }
  }
};

// Get the payload for the specified event type
const payload = samplePayloads[eventType] || samplePayloads.update;

// Parse URL
const url = new URL(targetUrl);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

// Prepare request options
const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

// Make the request
console.log('\n🚀 Sending test webhook...');
console.log(`   URL: ${targetUrl}`);
console.log(`   Event Type: ${eventType}`);
console.log(`   Opportunity ID: ${payload.action.subject_id}`);
console.log(`   Customer: ${payload.action.subject.organisation_name}`);
console.log('');

const req = client.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`✅ Response Status: ${res.statusCode}`);
    console.log('Response Headers:', res.headers);
    
    try {
      const jsonData = JSON.parse(data);
      console.log('Response Body:', JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Response Body:', data);
    }
    
    console.log('\n✨ Test webhook sent successfully!');
    console.log('Check your dashboard to see the event.\n');
  });
});

req.on('error', (error) => {
  console.error('❌ Error sending webhook:', error.message);
  console.error('');
  console.error('Troubleshooting:');
  console.error('  - Ensure the application is running');
  console.error('  - Check the URL is correct');
  console.error('  - Verify network connectivity');
  process.exit(1);
});

// Send the request
req.write(JSON.stringify(payload));
req.end();

// Available event types help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Test Webhook Script for Current RMS Watcher

Usage:
  node test-webhook.js [url] [event-type]

Event Types:
  update              - Generic opportunity update
  convert_to_order    - Convert opportunity to order
  mark_as_reserved    - Mark opportunity as reserved
  mark_as_lost        - Mark opportunity as lost
  create_item         - Add item to opportunity

Examples:
  node test-webhook.js
  node test-webhook.js http://localhost:3000/api/webhook
  node test-webhook.js http://localhost:3000/api/webhook convert_to_order
  node test-webhook.js https://your-app.vercel.app/api/webhook mark_as_reserved

Options:
  -h, --help          Show this help message
  `);
  process.exit(0);
}
