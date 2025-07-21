// API configuration for separate light and heavy servers
export const API_CONFIG = {
  // Light server - quick operations (evaluation, status)
  light: {
    url: process.env.NEXT_PUBLIC_LIGHT_SERVER_URL ?? "http://localhost:5001",
    endpoints: {
      evaluate: "/api/evaluate",
      status: "/api/status", 
      health: "/health",
      validateEmail: "/api/auth/validate-email",
      researchScrape: "/api/research/scrape"
    }
  },
  // Heavy server - resource-intensive operations (ingestion, processing)
  heavy: {
    url: process.env.NEXT_PUBLIC_HEAVY_SERVER_URL ?? "http://localhost:5002",
    endpoints: {
      ingest: "/api/ingest/gdrive",
      embed: "/api/embed",
      health: "/health"
    }
  },
  model: "openai/gpt-4o-mini",
};

// OpenRouter configuration (API key is now server-side only)
export const OPENROUTER_CONFIG = {
  defaultModel: "openai/gpt-4o-mini",
}; 