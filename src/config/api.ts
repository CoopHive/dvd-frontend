// API configuration for separate light and heavy servers
export const API_CONFIG = {
  // Light server - quick operations (evaluation, status)
  light: {
    url: process.env.NEXT_PUBLIC_LIGHT_SERVER_URL || "http://localhost:5001",
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
    url: process.env.NEXT_PUBLIC_HEAVY_SERVER_URL || "http://localhost:5002",
    endpoints: {
      ingest: "/api/ingest/gdrive",
      embed: "/api/embed",
      health: "/health"
    }
  },
  model: "openai/gpt-4o-mini",
};

// OpenRouter API configuration
export const OPENROUTER_CONFIG = {
  url: "https://openrouter.ai/api/v1/chat/completions",
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? "",
  defaultModel: "openai/gpt-4o-mini",
}; 