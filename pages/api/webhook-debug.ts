// API Route: /api/webhook-debug
// Debug webhook configuration and test connectivity

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    webhookEndpoint: {},
    currentRmsConnection: {},
    recommendations: []
  };

  // 1. Check environment variables
  diagnostics.environment = {
    hasSubdomain: !!process.env.CURRENT_RMS_SUBDOMAIN,
    subdomain: process.env.CURRENT_RMS_SUBDOMAIN || 'NOT SET',
    hasApiKey: !!process.env.CURRENT_RMS_API_KEY,
    apiKeyLength: process.env.CURRENT_RMS_API_KEY?.length || 0,
    hasPostgres: !!process.env.POSTGRES_URL,
    vercelUrl: process.env.VERCEL_URL || 'NOT SET',
    vercelProductionUrl: process.env.VERCEL_PRODUCTION_URL || 'NOT SET',
    nodeEnv: process.env.NODE_ENV || 'NOT SET'
  };

  // 2. Webhook endpoint info
  const host = req.headers.host || 'unknown';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const webhookUrl = `${protocol}://${host}/api/webhook`;

  diagnostics.webhookEndpoint = {
    url: webhookUrl,
    host: host,
    accessible: true, // We're accessing this endpoint now
    expectedProductionUrl: process.env.VERCEL_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PRODUCTION_URL}/api/webhook`
      : 'NOT CONFIGURED'
  };

  // 3. Check Current RMS API connectivity
  if (process.env.CURRENT_RMS_SUBDOMAIN && process.env.CURRENT_RMS_API_KEY) {
    try {
      const subdomain = process.env.CURRENT_RMS_SUBDOMAIN.replace('.current-rms.com', '').trim();
      const url = `https://api.current-rms.com/api/v1/webhooks?subdomain=${subdomain}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-SUBDOMAIN': subdomain,
          'X-AUTH-TOKEN': process.env.CURRENT_RMS_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const webhooks = data.webhooks || [];

        // Find webhooks pointing to our app
        const watcherWebhooks = webhooks.filter((w: any) =>
          w.name?.includes('Watcher') || w.target_url?.includes('current-rms-watcher')
        );

        diagnostics.currentRmsConnection = {
          status: 'connected',
          totalWebhooks: webhooks.length,
          watcherWebhooks: watcherWebhooks.length,
          webhooks: watcherWebhooks.map((w: any) => ({
            id: w.id,
            name: w.name,
            event: w.event,
            target_url: w.target_url,
            active: w.active
          }))
        };

        // Check if any webhooks are pointing to the wrong URL
        const wrongUrl = watcherWebhooks.filter((w: any) =>
          w.target_url && !w.target_url.includes(host) && !w.target_url.includes(process.env.VERCEL_PRODUCTION_URL || '')
        );

        if (wrongUrl.length > 0) {
          diagnostics.recommendations.push({
            severity: 'warning',
            issue: 'Some webhooks point to old/incorrect URLs',
            details: `${wrongUrl.length} webhook(s) need URL updates`,
            action: 'Run the webhook setup script or update manually in Current RMS'
          });
        }

        if (watcherWebhooks.length === 0) {
          diagnostics.recommendations.push({
            severity: 'critical',
            issue: 'No webhooks configured',
            details: 'No Watcher webhooks found in Current RMS',
            action: 'Run: npm run build (to trigger webhook setup)'
          });
        }

        // Check for inactive webhooks
        const inactive = watcherWebhooks.filter((w: any) => !w.active);
        if (inactive.length > 0) {
          diagnostics.recommendations.push({
            severity: 'warning',
            issue: 'Some webhooks are inactive',
            details: `${inactive.length} webhook(s) are disabled`,
            action: 'Activate webhooks in Current RMS settings'
          });
        }

      } else {
        diagnostics.currentRmsConnection = {
          status: 'error',
          statusCode: response.status,
          message: `HTTP ${response.status}: ${response.statusText}`
        };

        diagnostics.recommendations.push({
          severity: 'critical',
          issue: 'Cannot connect to Current RMS API',
          details: `API returned ${response.status}`,
          action: 'Check CURRENT_RMS_SUBDOMAIN and CURRENT_RMS_API_KEY in Vercel environment variables'
        });
      }

    } catch (error) {
      diagnostics.currentRmsConnection = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      diagnostics.recommendations.push({
        severity: 'critical',
        issue: 'Failed to connect to Current RMS',
        details: error instanceof Error ? error.message : 'Unknown error',
        action: 'Check network connectivity and API credentials'
      });
    }
  } else {
    diagnostics.currentRmsConnection = {
      status: 'not_configured',
      message: 'Missing CURRENT_RMS_SUBDOMAIN or CURRENT_RMS_API_KEY'
    };

    diagnostics.recommendations.push({
      severity: 'critical',
      issue: 'Current RMS credentials not configured',
      details: 'Cannot check webhook configuration without API access',
      action: 'Set CURRENT_RMS_SUBDOMAIN and CURRENT_RMS_API_KEY in Vercel'
    });
  }

  // 4. Overall health assessment
  diagnostics.overallHealth = diagnostics.recommendations.filter((r: any) => r.severity === 'critical').length === 0
    ? 'healthy'
    : 'needs_attention';

  return res.status(200).json({
    success: true,
    diagnostics
  });
}
