#!/usr/bin/env node

/**
 * Automatic Webhook Setup
 * Runs during Vercel deployment to register required webhooks
 * 
 * This script will:
 * 1. Check if webhooks already exist
 * 2. Create missing webhooks
 * 3. Update existing webhooks if target URL changed
 */

const https = require('https');

// Configuration from environment variables
const config = {
  subdomain: process.env.CURRENT_RMS_SUBDOMAIN,
  apiKey: process.env.CURRENT_RMS_API_KEY,
  vercelUrl: process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL,
  isDevelopment: process.env.NODE_ENV === 'development'
};

// Webhooks to create/maintain
const REQUIRED_WEBHOOKS = [
  { event: 'opportunity_update', description: 'General Updates' },
  { event: 'opportunity_convert_to_order', description: 'Convert to Order' },
  { event: 'opportunity_convert_to_quotation', description: 'Convert to Quotation' },
  { event: 'opportunity_mark_as_provisional', description: 'Mark as Provisional' },
  { event: 'opportunity_mark_as_reserved', description: 'Mark as Reserved' },
  { event: 'opportunity_mark_as_lost', description: 'Mark as Lost' },
  { event: 'opportunity_mark_as_dead', description: 'Mark as Dead' },
  { event: 'opportunity_cancel', description: 'Cancel' },
  { event: 'opportunity_complete', description: 'Complete' },
  { event: 'opportunity_confirm', description: 'Confirm' },
  { event: 'opportunity_create_item', description: 'Create Item' },
  { event: 'opportunity_update_item', description: 'Update Item' },
  { event: 'opportunity_destroy_item', description: 'Destroy Item' }
];

// Helper function to make API requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.current-rms.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'X-SUBDOMAIN': config.subdomain,
        'X-AUTH-TOKEN': config.apiKey,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Get existing webhooks
async function getExistingWebhooks() {
  try {
    const response = await makeRequest('GET', '/api/v1/webhooks');
    if (response.statusCode === 200 && response.data.webhooks) {
      return response.data.webhooks;
    }
    return [];
  } catch (error) {
    console.error('Error fetching webhooks:', error.message);
    return [];
  }
}

// Create a webhook
async function createWebhook(event, description, targetUrl) {
  const webhookData = {
    webhook: {
      name: `Watcher - ${description}`,
      event: event,
      target_url: targetUrl,
      active: true
    }
  };

  try {
    const response = await makeRequest('POST', '/api/v1/webhooks', webhookData);
    return response;
  } catch (error) {
    console.error(`Error creating webhook for ${event}:`, error.message);
    return null;
  }
}

// Update a webhook
async function updateWebhook(webhookId, targetUrl) {
  const webhookData = {
    webhook: {
      target_url: targetUrl,
      active: true
    }
  };

  try {
    const response = await makeRequest('PUT', `/api/v1/webhooks/${webhookId}`, webhookData);
    return response;
  } catch (error) {
    console.error(`Error updating webhook ${webhookId}:`, error.message);
    return null;
  }
}

// Main setup function
async function setupWebhooks() {
  console.log('🔧 Starting automatic webhook setup...\n');

  // Validate configuration
  if (!config.subdomain || !config.apiKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   - CURRENT_RMS_SUBDOMAIN');
    console.error('   - CURRENT_RMS_API_KEY');
    console.error('\nPlease set these in your Vercel project settings.');
    process.exit(1);
  }

  // Use stable production URL
  // VERCEL_PROJECT_PRODUCTION_URL is the stable production domain
  // VERCEL_URL is the deployment-specific URL (changes per deployment)
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_PRODUCTION_URL || 'current-rms-watcher.vercel.app';
  const targetUrl = `https://${productionUrl}/api/webhook`;

  console.log('📋 Configuration:');
  console.log(`   Subdomain: ${config.subdomain}`);
  console.log(`   Target URL: ${targetUrl}`);
  console.log(`   VERCEL_PROJECT_PRODUCTION_URL: ${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'not set'}`);
  console.log(`   VERCEL_PRODUCTION_URL: ${process.env.VERCEL_PRODUCTION_URL || 'not set'}`);
  console.log(`   VERCEL_URL: ${process.env.VERCEL_URL || 'not set'}`);
  console.log(`   Environment: ${config.isDevelopment ? 'Development' : 'Production'}\n`);

  // Get existing webhooks
  console.log('🔍 Checking existing webhooks...');
  const existingWebhooks = await getExistingWebhooks();
  console.log(`   Found ${existingWebhooks.length} existing webhooks\n`);

  // Track results
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // Process each required webhook
  for (const required of REQUIRED_WEBHOOKS) {
    const { event, description } = required;
    const webhookName = `Watcher - ${description}`;

    // Check if webhook already exists
    const existing = existingWebhooks.find(w => 
      w.name === webhookName && w.event === event
    );

    if (existing) {
      // Webhook exists - check if URL needs updating
      if (existing.target_url !== targetUrl) {
        console.log(`🔄 Updating: ${webhookName}`);
        const result = await updateWebhook(existing.id, targetUrl);
        if (result && result.statusCode === 200) {
          console.log(`   ✅ Updated (ID: ${existing.id})`);
          updated++;
        } else {
          console.log(`   ❌ Update failed`);
          failed++;
        }
      } else {
        console.log(`⏭️  Skipping: ${webhookName} (already configured)`);
        skipped++;
      }
    } else {
      // Create new webhook
      console.log(`➕ Creating: ${webhookName}`);
      const result = await createWebhook(event, description, targetUrl);
      if (result && result.statusCode === 201 && result.data.webhook) {
        console.log(`   ✅ Created (ID: ${result.data.webhook.id})`);
        created++;
      } else {
        console.log(`   ❌ Creation failed`);
        failed++;
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Webhook Setup Summary:');
  console.log('='.repeat(50));
  console.log(`   ✅ Created: ${created}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50) + '\n');

  if (failed > 0) {
    console.log('⚠️  Some webhooks failed to configure.');
    console.log('   You can manually configure them later using the setup script.\n');
  }

  if (created > 0 || updated > 0) {
    console.log('🎉 Webhook setup complete!');
    console.log(`   Your watcher is now monitoring: ${targetUrl}\n`);
  }
}

// Run the setup
setupWebhooks().catch(error => {
  console.error('❌ Fatal error during webhook setup:', error);
  process.exit(1);
});
