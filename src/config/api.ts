import { apiClient } from '@/lib/api-client';
import type { ApiRequestData } from '@/lib/types';

/**
 * Frontend API Configuration
 * Uses authenticated client methods - no server URLs exposed
 */
export const API_CONFIG = {
  // Light server - quick operations (evaluation, status)
  light: {
    validateEmail: (email: string) => apiClient.validateEmail(email),
    researchScrape: (data: ApiRequestData) => apiClient.researchScrape(data),
    status: (userEmail: string) => apiClient.getLightStatus(userEmail),
    health: () => apiClient.getLightHealth(),
  },
  // Heavy server - resource-intensive operations (ingestion, processing)
  heavy: {
    ingest: (data: ApiRequestData) => apiClient.ingestGdrive(data),
    embed: (data: ApiRequestData) => apiClient.generateEmbeddings(data),
    health: () => apiClient.getHeavyHealth(),
  },
  // Database server - database creation and management
  database: {
    evaluate: (data: ApiRequestData) => apiClient.evaluate(data),
    storeEvaluation: (data: ApiRequestData) => apiClient.storeEvaluation(data),
    health: () => apiClient.getDatabaseHealth(),
    whitelistAdd: (data: ApiRequestData) => apiClient.addToWhitelist(data),
    whitelistGet: () => apiClient.getWhitelist(),
    whitelistRemove: (data: ApiRequestData) => apiClient.removeFromWhitelist(data),
  },
  model: "openai/gpt-4o-mini",
};

// OpenRouter configuration (API key is now server-side only)
export const OPENROUTER_CONFIG = {
  defaultModel: "openai/gpt-4o-mini",
};