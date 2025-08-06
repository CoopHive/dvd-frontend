// API request/response types
export interface ResearchScrapeRequest {
  query: string;
  max_results?: number;
  [key: string]: unknown;
}

export interface IngestGdriveRequest {
  folder_id: string;
  user_email?: string;
  [key: string]: unknown;
}

export interface EmbedRequest {
  text: string;
  user_email?: string;
  [key: string]: unknown;
}

export interface EvaluateRequest {
  query: string;
  user_email?: string;
  [key: string]: unknown;
}

export interface StoreEvaluationRequest {
  evaluation_data: unknown;
  user_email?: string;
  [key: string]: unknown;
}

export interface WhitelistRequest {
  email: string;
  [key: string]: unknown;
}

export type MessageRole = "user" | "assistant";

// Generic API data type for flexible requests
export type ApiRequestData = Record<string, unknown>;

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
};
// Health check response
export interface HealthResponse {
  status: string;
  timestamp?: string;
  [key: string]: unknown;
}

export type Chat = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

export type UserChats = Record<string, Chat>; 
// Whitelist response
export interface WhitelistResponse {
  emails: string[];
  [key: string]: unknown;
}