// Dashboard Type Definitions

import { RiskLevel } from '@/lib/riskAssessment';

export interface DashboardOverview {
  totalEvents: number;
  totalOpportunities: number;
  successRate: number;
  failedEvents: number;
  uptime: number;
  lastEventTime?: Date;
}

export interface ActionTypeDistribution {
  actionType: string;
  count: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
}

export interface TimelineData {
  date: string;
  count: number;
}

export interface TopOpportunity {
  opportunityId: number;
  opportunityName: string;
  customerName: string;
  eventCount: number;
  lastActivity: Date;
}

export interface RecentActivity {
  id: string;
  timestamp: string;
  opportunityId: number;
  opportunityName: string;
  customerName: string;
  userName: string;
  actionType: string;
  newStatus?: string;
  processed: boolean;
  error?: string;
}

export interface SyncInfo {
  lastSyncTime: Date;
  recordsSynced: number;
  recordsFailed: number;
}

export interface DashboardData {
  overview: DashboardOverview;
  actionTypeDistribution: ActionTypeDistribution[];
  statusDistribution: StatusDistribution[];
  timeline: TimelineData[];
  topOpportunities: TopOpportunity[];
  recentActivity: RecentActivity[];
  syncInfo: SyncInfo | null;
}

export interface RiskSummaryItem {
  level: RiskLevel;
  count: number;
  totalValue: number;
}

export interface DebugDiagnostics {
  timestamp: string;
  environment: {
    hasSubdomain: boolean;
    subdomain: string;
    hasApiKey: boolean;
    apiKeyLength: number;
    hasPostgres: boolean;
    vercelUrl: string;
    vercelProductionUrl: string;
    nodeEnv: string;
  };
  endpoints: {
    webhook: string;
  };
}
