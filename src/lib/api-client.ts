import type { ApiRequestData } from './types';

/**
 * Authenticated API Client for BFF (Backend for Frontend) proxy routes
 * Uses NextAuth session management for authentication
 */

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: ApiRequestData;
}

class AuthenticatedAPIClient {
  private async makeRequest(url: string, options: RequestOptions = {}): Promise<Response> {
    const { body, ...fetchOptions } = options;
    
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: 'include', // Include NextAuth session cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    // If we get a 401, redirect to login (NextAuth handles token refresh automatically)
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/signin';
      }
      throw new Error('Authentication failed');
    }
    
    return response;
  }

  // Light Server Methods
  async validateEmail(email: string) {
    return this.makeRequest('/api/light/validate-email', {
      method: 'POST',
      body: { email },
    });
  }

  async researchScrape(data: ApiRequestData) {
    return this.makeRequest('/api/light/research-scrape', {
      method: 'POST',
      body: data,
    });
  }

  async getLightStatus(userEmail: string) {
    return this.makeRequest(`/api/light/status?user_email=${encodeURIComponent(userEmail)}`, {
      method: 'GET',
    });
  }

  async getLightHealth() {
    return this.makeRequest('/api/light/health', {
      method: 'GET',
    });
  }

  // Heavy Server Methods
  async ingestGdrive(data: ApiRequestData) {
    return this.makeRequest('/api/heavy/ingest-gdrive', {
      method: 'POST',
      body: data,
    });
  }

  async generateEmbeddings(data: ApiRequestData) {
    return this.makeRequest('/api/heavy/embed', {
      method: 'POST',
      body: data,
    });
  }

  async getHeavyHealth() {
    return this.makeRequest('/api/heavy/health', {
      method: 'GET',
    });
  }

  // Database Server Methods
  async evaluate(data: ApiRequestData) {
    return this.makeRequest('/api/database/evaluate', {
      method: 'POST',
      body: data,
    });
  }

  async getDatabaseHealth() {
    return this.makeRequest('/api/database/health', {
      method: 'GET',
    });
  }

  async storeEvaluation(data: ApiRequestData) {
    return this.makeRequest('/api/database/evaluation/store', {
      method: 'POST',
      body: data,
    });
  }

  // Whitelist Management
  async addToWhitelist(data: ApiRequestData) {
    return this.makeRequest('/api/database/whitelist/add', {
      method: 'POST',
      body: data,
    });
  }

  async getWhitelist() {
    return this.makeRequest('/api/database/whitelist/get', {
      method: 'GET',
    });
  }

  async removeFromWhitelist(data: ApiRequestData) {
    return this.makeRequest('/api/database/whitelist/remove', {
      method: 'POST',
      body: data,
    });
  }

  // Utility Methods
  async checkAllHealth() {
    const [light, heavy, database] = await Promise.allSettled([
      this.getLightHealth(),
      this.getHeavyHealth(),
      this.getDatabaseHealth(),
    ]);

    const lightData = light.status === 'fulfilled' ? await light.value.json() as unknown : null;
    const heavyData = heavy.status === 'fulfilled' ? await heavy.value.json() as unknown : null;
    const databaseData = database.status === 'fulfilled' ? await database.value.json() as unknown : null;

    return {
      light: lightData,
      heavy: heavyData,
      database: databaseData,
    };
  }
}

// Export singleton instance
export const apiClient = new AuthenticatedAPIClient();

// Export type for TypeScript users
export type { AuthenticatedAPIClient };