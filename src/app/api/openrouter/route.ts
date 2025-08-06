import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuthHandler } from '@/lib/auth-utils';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

interface OpenRouterRequest {
  type: 'process' | 'enhance' | 'contextual';
  model: string;
  userQuery: string;
  contents?: string[];
  collectionName?: string;
  chatMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  customPrompt?: string;
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface OpenRouterPayload {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

/**
 * POST /api/openrouter
 * Protected OpenRouter API proxy with JWT authentication
 */
export const POST = withAuthHandler(async (_user, request: NextRequest) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json() as OpenRouterRequest;
    const { type, model, userQuery, contents, collectionName, chatMessages, customPrompt } = body;

    let payload: OpenRouterPayload;
    let timeoutMs = 30000; // Default 30 seconds

    switch (type) {
      case 'process':
        if (!contents || !collectionName || !customPrompt) {
          return NextResponse.json(
            { error: "Missing required fields for process type" },
            { status: 400 }
          );
        }

        const context = contents.join("\n\n");
        payload = {
          model,
          messages: [
            {
              role: "system",
              content: customPrompt
                .replace(/\{collectionName\}/g, collectionName)
                .replace(/\{context\}/g, context),
            },
            {
              role: "user",
              content: userQuery,
            },
          ],
        };
        break;

      case 'enhance':
        if (!chatMessages) {
          return NextResponse.json(
            { error: "Missing chat messages for enhance type" },
            { status: 400 }
          );
        }

        // Build conversation context
        const recentMessages = chatMessages.slice(-10);
        let conversationContext = "";
        
        recentMessages.forEach((msg) => {
          const role = msg.role === 'user' ? 'User' : 'Assistant';
          conversationContext += `${role}: ${msg.content}\n\n`;
        });

        payload = {
          model,
          messages: [
            {
              role: "system",
              content: `You are a query enhancement assistant. Your task is to create a comprehensive, self-contained search query that incorporates relevant context from the conversation history.

Given the conversation history and the user's new question, create an enhanced search query that:
1. Includes relevant context from previous questions and answers when needed
2. Is self-contained and can be understood without the conversation history
3. Maintains the user's original intent but adds necessary context for better database search results
4. Is concise but comprehensive
5. Focuses on the information needed to answer the current question

IMPORTANT: Only return the improved query text, nothing else. Do not include explanations, quotation marks, or any other formatting.

Conversation History:
${conversationContext}

New User Question: ${userQuery}

Create an enhanced search query:`,
            },
            {
              role: "user",
              content: userQuery,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        };
        timeoutMs = 20000; // 20 seconds for query enhancement
        break;

      case 'contextual':
        if (!chatMessages) {
          return NextResponse.json(
            { error: "Missing chat messages for contextual type" },
            { status: 400 }
          );
        }

        // Build conversation context
        const recentContextMessages = chatMessages.slice(-15);
        
        const messages = [];
        
        // Add system message
        messages.push({
          role: "system",
          content: `You are a helpful AI assistant. Please respond to the user's question based on the conversation history provided. Use your general knowledge and reasoning abilities to provide a comprehensive and helpful response. Format your response with markdown: use **bold** for important points, bullet lists (•) for multiple items, and organize information in a readable format.

If the conversation contains previous responses from database searches or other sources, you may reference and build upon that information, but do not claim to have access to specific databases or documents unless they were mentioned in the conversation history.

Provide a thoughtful, well-structured response that addresses the user's question directly.`,
        });

        // Add conversation history
        recentContextMessages.forEach((msg) => {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        });

        // Add the current user query
        messages.push({
          role: "user",
          content: userQuery,
        });

        payload = {
          model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1500,
        };
        break;

      default:
        return NextResponse.json(
          { error: "Invalid request type" },
          { status: 400 }
        );
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
          "X-Title": "Chat UI Demo",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenRouter API error (${response.status}): ${errorText}`);
        return NextResponse.json(
          { error: `OpenRouter API error: ${response.status}` },
          { status: response.status }
        );
      }

      const result = await response.json() as OpenRouterResponse;
      
      if (result.choices?.[0]?.message?.content) {
        return NextResponse.json({
          content: result.choices[0].message.content,
          success: true
        });
      }

      return NextResponse.json(
        { error: "No response received from OpenRouter" },
        { status: 500 }
      );

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: `OpenRouter API timeout (${timeoutMs}ms)` },
          { status: 408 }
        );
      }
      
      console.error("OpenRouter API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
}); 