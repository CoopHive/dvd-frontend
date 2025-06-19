// API configuration for separate light and heavy servers
export const API_CONFIG = {
  // Light server - quick operations (evaluation, status)
  light: {
    // url: "https://1ba2-38-70-220-253.ngrok-free.app",
    url: "http://localhost:5001",
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
    // url: "https://82b3-38-70-220-253.ngrok-free.app", 
    url: "http://localhost:5002",
    endpoints: {
      ingest: "/api/ingest/gdrive",
      embed: "/api/embed",
      health: "/health"
    }
  },
  model: "openai/gpt-3.5-turbo-0613",
};

// OpenRouter API configuration
export const OPENROUTER_CONFIG = {
  url: "https://openrouter.ai/api/v1/chat/completions",
  defaultModel: "openai/gpt-3.5-turbo",
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? "",
}; 