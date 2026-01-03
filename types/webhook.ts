// Webhook Test Type Definitions

export interface WebhookTestResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING' | 'ERROR';
  details: string;
  eventCount?: number;
  webhookResponse?: unknown;
}

export interface WebhookTestResults {
  success: boolean;
  message: string;
  tests?: WebhookTestResult[];
  nextSteps?: string[];
}
