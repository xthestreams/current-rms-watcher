import { useState } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function WebhookTestPage() {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runTest = async () => {
    setTesting(true);
    setResults(null);

    try {
      const response = await fetch('/api/quick-webhook-test', {
        method: 'POST'
      });

      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({
        success: false,
        message: 'Error running test',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    setTesting(false);
  };

  const checkEvents = async () => {
    try {
      const response = await fetch('/api/events?limit=10');
      const data = await response.json();

      alert(`Found ${data.count} events in database.\n\nCheck console for details.`);
      console.log('Recent Events:', data);
    } catch (error) {
      alert('Error fetching events: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'FAILED':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'WARNING':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'ERROR':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <>
      <Head>
        <title>Webhook Test - Current RMS Watcher</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                <h1 className="text-3xl font-bold">Webhook Test</h1>
                <p className="mt-1 text-purple-100">Test webhook functionality end-to-end</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={runTest}
              disabled={testing}
              className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
            >
              {testing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running Tests...
                </span>
              ) : (
                '🧪 Run Diagnostic Test'
              )}
            </button>

            <button
              onClick={checkEvents}
              className="px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-lg"
            >
              📊 Check Events
            </button>
          </div>

          {/* Results */}
          {results && (
            <div className="space-y-6">
              {/* Overall Status */}
              <div className={`p-6 rounded-lg border-2 ${
                results.success
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-4xl">
                    {results.success ? '✅' : '❌'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {results.success ? 'All Tests Passed' : 'Tests Failed'}
                    </h2>
                    <p className="text-gray-600">{results.message}</p>
                  </div>
                </div>
              </div>

              {/* Individual Tests */}
              {results.tests && results.tests.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Test Results</h3>
                  <div className="space-y-3">
                    {results.tests.map((test: any, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border-2 ${getStatusColor(test.status)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold">{test.name}</h4>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white">
                            {test.status}
                          </span>
                        </div>
                        <p className="text-sm">{test.details}</p>
                        {test.eventCount !== undefined && (
                          <p className="text-sm mt-2 font-mono">Events in database: {test.eventCount}</p>
                        )}
                        {test.webhookResponse && (
                          <details className="mt-2">
                            <summary className="text-sm cursor-pointer hover:underline">
                              View webhook response
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-900 text-green-400 rounded text-xs overflow-auto">
                              {JSON.stringify(test.webhookResponse, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {results.nextSteps && results.nextSteps.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-blue-900 mb-3">Next Steps</h3>
                  <div className="space-y-2">
                    {results.nextSteps.map((step: string, index: number) => (
                      <div key={index} className="text-sm text-blue-800">
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Results */}
              <details>
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                  Show raw diagnostic data
                </summary>
                <pre className="mt-2 p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Instructions */}
          {!results && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">What This Tests</h3>
              <div className="space-y-3 text-gray-600">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">1️⃣</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Database Configuration</h4>
                    <p className="text-sm">Checks if POSTGRES_URL is configured and accessible</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">2️⃣</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Webhook Endpoint</h4>
                    <p className="text-sm">Sends a test webhook and verifies it's accepted</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">3️⃣</span>
                  <div>
                    <h4 className="font-bold text-gray-900">Event Retrieval</h4>
                    <p className="text-sm">Queries database to check if events are being saved</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                <h4 className="font-bold text-yellow-900 mb-2">💡 Tip</h4>
                <p className="text-sm text-yellow-800">
                  Open your browser console (F12 → Console) before running tests to see detailed logging.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
