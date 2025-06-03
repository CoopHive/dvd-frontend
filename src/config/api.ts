// API configuration
export const API_CONFIG = {
  url: "http://localhost:3001",
  collections: ["openai_paragraph_openai", "openai_fixed_length_openai"],
  model: "openai/gpt-3.5-turbo-0613",
};

// OpenRouter API configuration
export const OPENROUTER_CONFIG = {
  url: "https://openrouter.ai/api/v1/chat/completions",
  defaultModel: "openai/gpt-3.5-turbo",
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? "",
}; 