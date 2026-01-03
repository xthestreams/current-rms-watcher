// Current RMS API Client
// Handles API communication with Current RMS

const SUBDOMAIN = process.env.CURRENT_RMS_SUBDOMAIN;
const API_KEY = process.env.CURRENT_RMS_API_KEY;
const BASE_URL = `https://api.current-rms.com/api/v1`;

interface CurrentRMSOpportunity {
  id: number;
  name: string;
  subject?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  opportunity_status?: string;
  created_at?: string;
  updated_at?: string;
  venue_name?: string;
  organisation_id?: number;
  organisation_name?: string;
  owner_id?: number;
  owner_name?: string;
  charge_total?: string;
  total_value?: string;
  [key: string]: any;
}

export class CurrentRMSClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    if (!SUBDOMAIN || !API_KEY) {
      throw new Error('Current RMS credentials not configured');
    }
    this.baseUrl = BASE_URL;
    this.apiKey = API_KEY;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = {
      'X-SUBDOMAIN': SUBDOMAIN!,
      'X-AUTH-TOKEN': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    console.log(`[CurrentRMS] Requesting: ${endpoint}`);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Current RMS API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Fetch opportunities with date range filter
   * @param startDate - Start date in ISO format (default: 30 days ago)
   * @param endDate - End date in ISO format (default: far future)
   * @param page - Page number for pagination
   * @param perPage - Results per page (max 100)
   */
  async getOpportunities(
    startDate?: string,
    endDate?: string,
    page: number = 1,
    perPage: number = 100
  ): Promise<{ opportunities: CurrentRMSOpportunity[]; meta: any }> {
    const params = new URLSearchParams();

    if (startDate) {
      params.append('q[starts_at_gteq]', startDate);
    }
    if (endDate) {
      params.append('q[ends_at_lteq]', endDate);
    }

    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    const endpoint = `/opportunities?${params.toString()}`;
    const response = await this.request<{ opportunities: CurrentRMSOpportunity[]; meta: any }>(endpoint);

    console.log(`[CurrentRMS] Fetched ${response.opportunities?.length || 0} opportunities (page ${page})`);

    return response;
  }

  /**
   * Fetch a single opportunity by ID
   */
  async getOpportunity(id: number): Promise<CurrentRMSOpportunity> {
    const response = await this.request<{ opportunity: CurrentRMSOpportunity }>(`/opportunities/${id}`);
    return response.opportunity;
  }

  /**
   * Fetch all opportunities in date range (handles pagination automatically)
   */
  async getAllOpportunities(
    startDate?: string,
    endDate?: string
  ): Promise<CurrentRMSOpportunity[]> {
    const allOpportunities: CurrentRMSOpportunity[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getOpportunities(startDate, endDate, page, 100);

      if (response.opportunities && response.opportunities.length > 0) {
        allOpportunities.push(...response.opportunities);

        // Check if there are more pages
        const totalPages = response.meta?.total_pages || 1;
        hasMore = page < totalPages;
        page++;

        // Add a small delay to avoid rate limiting
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`[CurrentRMS] Fetched total of ${allOpportunities.length} opportunities`);
    return allOpportunities;
  }

  /**
   * Fetch opportunities updated since a specific date
   */
  async getUpdatedOpportunities(
    since: string,
    page: number = 1,
    perPage: number = 100
  ): Promise<{ opportunities: CurrentRMSOpportunity[]; meta: any }> {
    const params = new URLSearchParams();
    params.append('q[updated_at_gteq]', since);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    const endpoint = `/opportunities?${params.toString()}`;
    return this.request<{ opportunities: CurrentRMSOpportunity[]; meta: any }>(endpoint);
  }
}

// Helper to create default date range (-30 days to +1 year)
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();

  // 30 days ago
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 30);

  // 1 year in the future
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + 1);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

// Singleton instance
let clientInstance: CurrentRMSClient | null = null;

export function getCurrentRMSClient(): CurrentRMSClient {
  if (!clientInstance) {
    clientInstance = new CurrentRMSClient();
  }
  return clientInstance;
}
