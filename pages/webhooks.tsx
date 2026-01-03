import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function WebhookDebugPage() {
  const router = useRouter();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testWebhookStatus, setTestWebhookStatus] = useState<string>('');

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/webhook-debug');
      const data = await response.json();
      setDiagnostics(data.diagnostics);
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
    }
    setLoading(false);
  };

  const sendTestWebhook = async () => {
    setTestWebhookStatus('sending');
    try {
      const response = await fetch('/api/test-webhook', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        setTestWebhookStatus('success');
        setTimeout(() => {
          setTestWebhookStatus('');
          fetchDiagnostics();
        }, 2000);
      } else {
        setTestWebhookStatus('error');
        setTimeout(() => setTestWebhookStatus(''), 3000);
      }
    } catch (error) {
      console.error('Error sending test webhook:', error);
      setTestWebhookStatus('error');
      setTimeout(() => setTestWebhookStatus(''), 3000);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'warning':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading diagnostics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Webhook Diagnostics - Current RMS Watcher</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="text-white hover:text-purple-100 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-3xl font-bold">Webhook Diagnostics</h1>
                  <p className="mt-1 text-purple-100">Debug webhook configuration and connectivity</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchDiagnostics}
                  className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  🔄 Refresh
                </button>
                <button
                  onClick={sendTestWebhook}
                  disabled={testWebhookStatus === 'sending'}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {testWebhookStatus === 'sending' ? 'Sending...' : testWebhookStatus === 'success' ? '✓ Sent!' : '📤 Test Webhook'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Overall Health */}
          <div className={`mb-6 p-6 rounded-lg border-2 ${
            diagnostics?.overallHealth === 'healthy'
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
          }`}>
            <div className="flex items-center gap-3">
              <div className="text-4xl">
                {diagnostics?.overallHealth === 'healthy' ? '✅' : '❌'}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {diagnostics?.overallHealth === 'healthy' ? 'System Healthy' : 'Action Required'}
                </h2>
                <p className="text-gray-600">
                  {diagnostics?.overallHealth === 'healthy'
                    ? 'All webhook systems are operational'
                    : 'Some webhook issues need attention'}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {diagnostics?.recommendations && diagnostics.recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-3">
                {diagnostics.recommendations.map((rec: any, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${getSeverityColor(rec.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{getSeverityIcon(rec.severity)}</div>
                      <div className="flex-1">
                        <h4 className="font-bold mb-1">{rec.issue}</h4>
                        <p className="text-sm mb-2">{rec.details}</p>
                        <div className="text-sm font-mono bg-white bg-opacity-50 p-2 rounded">
                          {rec.action}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Environment Variables */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Environment Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Subdomain</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {diagnostics?.environment?.subdomain}
                  </span>
                  {diagnostics?.environment?.hasSubdomain ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-red-600">✗</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">API Key</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {diagnostics?.environment?.hasApiKey ? `${'•'.repeat(diagnostics?.environment?.apiKeyLength)}` : 'NOT SET'}
                  </span>
                  {diagnostics?.environment?.hasApiKey ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-red-600">✗</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Database</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {diagnostics?.environment?.hasPostgres ? 'Connected' : 'NOT SET'}
                  </span>
                  {diagnostics?.environment?.hasPostgres ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-red-600">✗</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Environment</label>
                <div className="mt-1">
                  <span className="font-mono text-sm">{diagnostics?.environment?.nodeEnv}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook Endpoint */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Webhook Endpoint</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Current URL</label>
                <div className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded">
                  {diagnostics?.webhookEndpoint?.url}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Expected Production URL</label>
                <div className="mt-1 font-mono text-sm bg-gray-100 p-2 rounded">
                  {diagnostics?.webhookEndpoint?.expectedProductionUrl}
                </div>
              </div>
            </div>
          </div>

          {/* Current RMS Webhooks */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Current RMS Webhooks</h3>

            {diagnostics?.currentRmsConnection?.status === 'connected' ? (
              <>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Total Webhooks</div>
                    <div className="text-2xl font-bold">{diagnostics.currentRmsConnection.totalWebhooks}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Watcher Webhooks</div>
                    <div className="text-2xl font-bold text-blue-600">{diagnostics.currentRmsConnection.watcherWebhooks}</div>
                  </div>
                </div>

                {diagnostics.currentRmsConnection.webhooks && diagnostics.currentRmsConnection.webhooks.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-2 px-3">ID</th>
                          <th className="text-left py-2 px-3">Name</th>
                          <th className="text-left py-2 px-3">Event</th>
                          <th className="text-left py-2 px-3">Target URL</th>
                          <th className="text-center py-2 px-3">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diagnostics.currentRmsConnection.webhooks.map((webhook: any) => (
                          <tr key={webhook.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 font-mono">{webhook.id}</td>
                            <td className="py-2 px-3">{webhook.name}</td>
                            <td className="py-2 px-3 font-mono text-xs">{webhook.event}</td>
                            <td className="py-2 px-3 font-mono text-xs truncate max-w-xs">{webhook.target_url}</td>
                            <td className="py-2 px-3 text-center">
                              {webhook.active ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-red-600">✗</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No Watcher webhooks found
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">⚠️</div>
                <div className="text-gray-900 font-medium mb-1">
                  {diagnostics?.currentRmsConnection?.status === 'not_configured'
                    ? 'Not Configured'
                    : 'Connection Error'}
                </div>
                <div className="text-sm text-gray-600">
                  {diagnostics?.currentRmsConnection?.message || diagnostics?.currentRmsConnection?.error}
                </div>
              </div>
            )}
          </div>

          {/* Raw Diagnostics */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
              Show raw diagnostics data
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto text-xs">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </>
  );
}
