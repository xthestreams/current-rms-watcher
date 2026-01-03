import { useState } from 'react';
import Head from 'next/head';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
    setSyncResult(null);
  };

  const testSync = async () => {
    setSyncing(true);
    setLogs([]);
    setSyncResult(null);

    addLog('🚀 Starting Initial Sync test...');

    try {
      addLog('📡 Calling /api/sync/initial...');

      const response = await fetch('/api/sync/initial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      addLog(`📥 Response status: ${response.status} ${response.statusText}`);

      const data = await response.json();

      addLog('📦 Response data received');
      addLog(JSON.stringify(data, null, 2));

      setSyncResult(data);

      if (data.success) {
        addLog(`✅ Sync completed successfully!`);
        addLog(`   Records synced: ${data.recordsSynced}`);
        addLog(`   Records failed: ${data.recordsFailed}`);
        addLog(`   Duration: ${data.duration}s`);
      } else {
        addLog(`❌ Sync failed: ${data.error || data.message}`);
      }

    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const testApiConnection = async () => {
    addLog('🔍 Testing Current RMS API connection...');
    setSyncing(true);

    try {
      const response = await fetch('/api/sync/test');
      const data = await response.json();

      // Add all logs from the API
      if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((log: string) => addLog(log));
      }

      if (data.success) {
        addLog(`✅ Test successful!`);
        addLog(`📊 Summary:`);
        addLog(`   Total records in Current RMS: ${data.summary?.totalRecords || 0}`);
        addLog(`   Pages needed: ${data.summary?.totalPages || 0}`);
        addLog(`   Estimated sync time: ${data.summary?.estimatedFullSyncTime || 'Unknown'}`);

        if (data.sampleOpportunities && data.sampleOpportunities.length > 0) {
          addLog(`📋 Sample opportunities fetched successfully`);
        }
      } else {
        addLog(`❌ Test failed: ${data.error}`);
      }

      setSyncResult(data);
    } catch (error) {
      addLog(`❌ API connection failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Head>
        <title>Debug - Current RMS Watcher</title>
      </Head>

      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🔧 Debug Console</h1>
          <p className="text-gray-400 mb-8">Real-time sync debugging and diagnostics</p>

          {/* Control Panel */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Controls</h2>
            <div className="flex gap-4">
              <button
                onClick={testSync}
                disabled={syncing}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {syncing ? 'Syncing...' : '🚀 Test Initial Sync'}
              </button>

              <button
                onClick={testApiConnection}
                disabled={syncing}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                🔍 Test API Connection
              </button>

              <button
                onClick={clearLogs}
                disabled={syncing}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                🗑️ Clear Logs
              </button>
            </div>
          </div>

          {/* Sync Result Summary */}
          {syncResult && (
            <div className={`rounded-lg p-6 mb-6 ${
              syncResult.success
                ? 'bg-green-900 border border-green-700'
                : 'bg-red-900 border border-red-700'
            }`}>
              <h2 className="text-xl font-semibold mb-4">
                {syncResult.success ? '✅ Sync Result' : '❌ Sync Failed'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-400">Status</div>
                  <div className="text-2xl font-bold">
                    {syncResult.success ? 'Success' : 'Failed'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Records Synced</div>
                  <div className="text-2xl font-bold">{syncResult.recordsSynced || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Records Failed</div>
                  <div className="text-2xl font-bold">{syncResult.recordsFailed || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Duration</div>
                  <div className="text-2xl font-bold">{syncResult.duration || 0}s</div>
                </div>
              </div>
              {syncResult.error && (
                <div className="mt-4 p-4 bg-black bg-opacity-30 rounded font-mono text-sm">
                  <div className="text-red-400 font-semibold mb-2">Error Details:</div>
                  {syncResult.error}
                </div>
              )}
            </div>
          )}

          {/* Logs Console */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Console Logs</h2>
              <div className="text-sm text-gray-400">
                {logs.length} entries
              </div>
            </div>

            <div className="bg-black rounded p-4 font-mono text-sm h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No logs yet. Click a button above to start testing.
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={`${
                        log.includes('❌') ? 'text-red-400' :
                        log.includes('✅') ? 'text-green-400' :
                        log.includes('🚀') || log.includes('📡') ? 'text-blue-400' :
                        log.includes('📥') || log.includes('📦') ? 'text-yellow-400' :
                        'text-gray-300'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Environment Info */}
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Current URL:</span>
                <span className="font-mono">{typeof window !== 'undefined' ? window.location.href : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Deployment:</span>
                <span className="font-mono">
                  {typeof window !== 'undefined' && window.location.hostname.includes('vercel') ? 'Vercel' : 'Local'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
            <div className="space-y-2">
              <a
                href="/"
                className="block text-blue-400 hover:text-blue-300 transition-colors"
              >
                ← Back to Dashboard
              </a>
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-400 hover:text-blue-300 transition-colors"
              >
                Open Vercel Dashboard →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
