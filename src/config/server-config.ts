/**
 * Server-side only configuration
 * Contains actual server URLs - never exposed to frontend
 */

export const SERVER_CONFIG = {
  light: {
    url: process.env.LIGHT_SERVER_URL ?? "http://localhost:5001",
    endpoints: {
      status: "/api/status", 
      health: "/health",
      validateEmail: "/api/auth/validate-email",
      researchScrape: "/api/research/scrape"
    }
  },
  heavy: {
    url: process.env.HEAVY_SERVER_URL ?? "http://localhost:5002",
    endpoints: {
      ingest: "/api/ingest/gdrive",
      embed: "/api/embed",
      health: "/health"
    }
  },
  database: {
    url: process.env.DATABASE_SERVER_URL ?? "http://localhost:5003",
    endpoints: {
      evaluate: "/api/evaluate",
      storeEvaluation: "/api/evaluation/store",
      health: "/health",
      whitelistAdd: "/api/whitelist/add",
      whitelistGet: "/api/whitelist/get",
      whitelistRemove: "/api/whitelist/remove"
    }
  }
};