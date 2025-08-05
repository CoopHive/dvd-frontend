import { apiClient } from '@/lib/api-client';

/**
 * Frontend API Configuration
 * Uses authenticated client methods - no server URLs exposed
 */
export const API_CONFIG = {
  // Light server - quick operations (evaluation, status)
  light: {
    validateEmail: (email: string) => apiClient.validateEmail(email),
    researchScrape: (data: any) => apiClient.researchScrape(data),
    status: (userEmail: string) => apiClient.getLightStatus(userEmail),
    health: () => apiClient.getLightHealth(),
  },
  // Heavy server - resource-intensive operations (ingestion, processing)
  heavy: {
    ingest: (data: any) => apiClient.ingestGdrive(data),
    embed: (data: any) => apiClient.generateEmbeddings(data),
    health: () => apiClient.getHeavyHealth(),
  },
  // Database server - database creation and management
  database: {
    evaluate: (data: any) => apiClient.evaluate(data),
    storeEvaluation: (data: any) => apiClient.storeEvaluation(data),
    health: () => apiClient.getDatabaseHealth(),
    whitelistAdd: (data: any) => apiClient.addToWhitelist(data),
    whitelistGet: () => apiClient.getWhitelist(),
    whitelistRemove: (data: any) => apiClient.removeFromWhitelist(data),
  },
  model: "openai/gpt-4o-mini",
};

// OpenRouter configuration (API key is now server-side only)
export const OPENROUTER_CONFIG = {
  defaultModel: "openai/gpt-4o-mini",
};