"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useSession } from "next-auth/react";
import type { Chat } from "~/lib/types";
import {
  getAllChats,
  getChat,
  createChat,
  addMessageToChat,
  deleteChat,
} from "~/lib/chat-storage";
import { API_CONFIG, OPENROUTER_CONFIG } from "~/config/api";
import { getCustomPrompts, interpolatePrompt } from "~/config/prompts";

export type ResponseOption = {
  id: string;
  content: string;
  score?: number;
};

export type ResponseMode = "manual" | "scoring" | "ranking";

// For debugging
const logApiRequest = (url: string, payload: Record<string, unknown>) => {
  console.log(`Sending request to: ${url}`);
  console.log("Request payload:", JSON.stringify(payload, null, 2));
};

// Type definitions for API responses
interface CollectionResult {
  results?: Array<{
    metadata?: {
      content?: string;
    };
  }>;
  error?: string;
}

interface ApiResponse {
  total_collections?: number;
  collection_names?: string[];
  user_email?: string;
  collection_results?: Record<string, CollectionResult>;
}

interface OpenRouterChoice {
  message?: {
    content?: string;
  };
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
}

export const useChat = () => {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();

  const userId = session?.user?.email ?? "";

  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [responseOptions, setResponseOptions] = useState<ResponseOption[]>([]);
  const [showResponseOptions, setShowResponseOptions] = useState(false);
  const [responseMode, setResponseMode] = useState<ResponseMode>("manual");
  const [scoredOptions, setScoredOptions] = useState<Map<string, number>>(new Map());
  const [rankedOptions, setRankedOptions] = useState<string[]>([]);
  
  // Expose collection information
  const [collectionInfo, setCollectionInfo] = useState<{
    totalCollections: number;
    collectionNames: string[];
    userEmail: string;
  } | null>(null);

  // New piece of state: which OpenRouter model to use
  const [openRouterModel, setOpenRouterModel] = useState<string>(
    OPENROUTER_CONFIG.defaultModel
  );

  // Upload status tracking - persist in localStorage
  const [uploadStatus, setUploadStatus] = useState<{
    isTracking: boolean;
    totalJobs: number;
    completedJobs: number;
    percentage: number;
  }>(() => {
    // Initialize from localStorage if available
    if (typeof window !== "undefined" && userId) {
      const stored = localStorage.getItem(`uploadStatus_${userId}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as {
            isTracking: boolean;
            totalJobs: number;
            completedJobs: number;
            percentage: number;
          };
          return parsed;
        } catch (e) {
          console.error("Error parsing stored upload status:", e);
        }
      }
    }
    return {
      isTracking: false,
      totalJobs: 0,
      completedJobs: 0,
      percentage: 0,
    };
  });

  // Save upload status to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && userId) {
      localStorage.setItem(`uploadStatus_${userId}`, JSON.stringify(uploadStatus));
    }
  }, [uploadStatus, userId]);

  // Track if initial load has happened
  const initialLoadComplete = useRef(false);

  const chatId = params?.chatId as string | undefined;

  // Load chats from storage
  const loadChats = useCallback(() => {
    if (typeof window !== "undefined" && userId) {
      const allChats = getAllChats(userId);
      const chatArray = Object.values(allChats).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      setChats(chatArray);

      // If there's a chatId in the route, load that chat
      if (chatId) {
        const chat = getChat(userId, chatId);
        if (chat) {
          setActiveChat(chat);
        } else if (initialLoadComplete.current) {
          // Only redirect if this isn't the initial load
          router.push("/");
        }
      }
    }
  }, [chatId, router, userId]);

  // Initial load effect
  useEffect(() => {
    if (userId && !initialLoadComplete.current) {
      const allChats = getAllChats(userId);
      const chatArray = Object.values(allChats).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      setChats(chatArray);

      // If there's a chatId in the route, load that chat
      if (chatId) {
        const chat = getChat(userId, chatId);
        if (chat) {
          setActiveChat(chat);
        } else {
          // Chat not found, redirect to home but don't auto-create
          router.push("/");
        }
      }
      // Don't automatically select a chat if no chatId is specified

      initialLoadComplete.current = true;
    }
  }, [userId, chatId, router]);

  // Update chats when userId or chatId changes
  useEffect(() => {
    if (initialLoadComplete.current && userId) {
      loadChats();
    }
  }, [loadChats, userId]);

  // Start a new chat
  const startNewChat = useCallback(() => {
    if (!userId) return;

    const welcomeMessage = "How can I help you today?";
    const newChat = createChat(userId, welcomeMessage);
    setActiveChat(newChat);
    setInputValue("");

    // Update chats list
    const allChats = getAllChats(userId);
    const chatArray = Object.values(allChats).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
    setChats(chatArray);

    // Navigate to the new chat
    router.push(`/chat/${newChat.id}`);
  }, [router, userId]);


  // Process collection content with OpenRouter
  const processWithOpenRouter = useCallback(async (
    userQuery: string,
    contents: string[],
    collectionName: string
  ): Promise<string> => {
    if (!OPENROUTER_CONFIG.apiKey) {
      return "Please add your OpenRouter API key.";
    }

    // Combine the content into a context string
    const context = contents.join("\n\n");

    // Get custom prompts and interpolate the research assistant prompt
    const customPrompts = getCustomPrompts(userId);
    const systemPrompt = interpolatePrompt(customPrompts.researchAssistant, {
      collectionName,
      context
    });

    // Prepare the message for OpenRouter
    const openRouterPayload = {
      model: openRouterModel, // <-- use the selected model from state
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userQuery,
        },
      ],
    };

    console.log(
      `Sending to OpenRouter (collection: ${collectionName}) with model "${openRouterModel}":`,
      openRouterPayload
    );

    const response = await fetch(OPENROUTER_CONFIG.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_CONFIG.apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Chat UI Demo",
      },
      body: JSON.stringify(openRouterPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as OpenRouterResponse;
    console.log(
      `OpenRouter response (collection: ${collectionName}):`,
      result
    );

    // Extract the assistant's response
    if (result.choices?.[0]?.message?.content) {
      return result.choices[0].message.content;
    }

    return "No response received from OpenRouter.";
  }, [openRouterModel, userId]);

  // Create enhanced query using chat context
  const createEnhancedQuery = useCallback(async (
    userQuery: string,
    chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> => {
    if (!OPENROUTER_CONFIG.apiKey) {
      console.warn("No OpenRouter API key available, using original query");
      return userQuery;
    }

    // If there are no previous messages, just return the original query
    if (chatMessages.length === 0) {
      return userQuery;
    }

    // Build conversation context from recent messages (last 10 messages max to avoid token limits)
    const recentMessages = chatMessages.slice(-10);
    let conversationContext = "";
    
    recentMessages.forEach((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      conversationContext += `${role}: ${msg.content}\n\n`;
    });

    // Prepare the message for OpenRouter to create an enhanced query
    const queryEnhancementPayload = {
      model: openRouterModel,
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

    try {
      console.log("Creating enhanced query with context...");
      console.log(`Using OpenRouter model: ${openRouterModel}`);
      
      const response = await fetch(OPENROUTER_CONFIG.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_CONFIG.apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Chat UI Demo - Query Enhancement",
        },
        body: JSON.stringify(queryEnhancementPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Query enhancement failed (${response.status}): ${errorText}`);
        return userQuery; // Fall back to original query
      }

      const result = (await response.json()) as OpenRouterResponse;
      
      if (result.choices?.[0]?.message?.content) {
        const enhancedQuery = result.choices[0].message.content.trim();
        console.log("Original query:", userQuery);
        console.log("Enhanced query:", enhancedQuery);
        return enhancedQuery;
      }

      return userQuery;
    } catch (error) {
      console.error("Error creating enhanced query:", error);
      return userQuery; // Fall back to original query
    }
  }, [openRouterModel]);

  // Generate contextual GPT response without RAG
  const generateContextualGPTResponse = useCallback(async (
    userQuery: string,
    chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> => {
    if (!OPENROUTER_CONFIG.apiKey) {
      return "OpenRouter API key is required for GPT responses.";
    }

    // Build conversation context from recent messages (last 15 messages max)
    const recentMessages = chatMessages.slice(-5);
    
    // Create messages array for the conversation
    const messages = [];
    
    // Add system message
    messages.push({
      role: "system",
      content: `You are a helpful AI assistant. Please respond to the user's question based on the conversation history provided. Use your general knowledge and reasoning abilities to provide a comprehensive and helpful response. Format your response with markdown: use **bold** for important points, bullet lists (•) for multiple items, and organize information in a readable format.

If the conversation contains previous responses from database searches or other sources, you may reference and build upon that information, but do not claim to have access to specific databases or documents unless they were mentioned in the conversation history.

Provide a thoughtful, well-structured response that addresses the user's question directly.`,
    });

    // Add conversation history
    recentMessages.forEach((msg) => {
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

    const gptPayload = {
      model: openRouterModel,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500,
    };

    try {
      console.log("Generating contextual GPT response...");
      console.log(`Using OpenRouter model: ${openRouterModel}`);
      
      const response = await fetch(OPENROUTER_CONFIG.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_CONFIG.apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "Chat UI Demo - Contextual Response",
        },
        body: JSON.stringify(gptPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GPT API error (${response.status}): ${errorText}`);
      }

      const result = (await response.json()) as OpenRouterResponse;
      
      if (result.choices?.[0]?.message?.content) {
        return result.choices[0].message.content;
      }

      return "No response received from GPT.";
    } catch (error) {
      console.error("Error generating contextual GPT response:", error);
      return `Error generating GPT response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
    }
  }, [openRouterModel]);

  // Fetch response options from API
  const fetchResponseOptions = useCallback(
    async (query: string): Promise<ResponseOption[]> => {
      // Get chat context for query enhancement
      let enhancedQuery = query;
      let chatMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      
      if (activeChat && activeChat.messages.length > 0) {
        // Extract previous messages (excluding the welcome message if it exists)
        chatMessages = activeChat.messages
          .filter(msg => msg.content !== "How can I help you today?")
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }));
        
        enhancedQuery = await createEnhancedQuery(query, chatMessages);
      }

      const payload = {
        query: enhancedQuery, // Use enhanced query for database search
        db_path: null,
        model_name: openRouterModel, // Use selected model instead of API_CONFIG.model
        user_email: session?.user?.email, // Include user email for additional context
      };

      // Use light server for evaluation operations
      const evaluateUrl = `${API_CONFIG.light.url}${API_CONFIG.light.endpoints.evaluate}`;
      logApiRequest(evaluateUrl, payload);

      try {
        const response = await fetch(evaluateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        console.log(`API response status: ${response.status}`);

        if (!response.ok) {
          console.error(`API request failed with status ${response.status}`);
          
          // Generate contextual GPT response even if RAG fails
          const gptResponse = await generateContextualGPTResponse(query, chatMessages);
          
          return [
            {
              id: uuidv4(),
              content: `**GPT Response (No Database Access):** ${gptResponse}`,
            },
            {
              id: uuidv4(),
              content: `Error: API request failed with status ${response.status}. Please check the light server connection (port 5001).`,
            },
            {
              id: uuidv4(),
              content: "The light server might not be running or the endpoint might be incorrect.",
            },
            {
              id: uuidv4(),
              content:
                "You can continue testing the interface while the backend issue is being resolved.",
            },
          ];
        }

        const data = (await response.json()) as ApiResponse;
        console.log("API response data:", data);

        // Check if there are no collections available
        if (data.total_collections === 0) {
          console.log("No collections found for user");
          
          // Update collection information even when empty
          setCollectionInfo({
            totalCollections: 0,
            collectionNames: [],
            userEmail: data.user_email ?? "",
          });

          // Generate contextual GPT response when no collections available
          const gptResponse = await generateContextualGPTResponse(query, chatMessages);

          return [
            {
              id: uuidv4(),
              content: `**GPT Response (No Database Access):** ${gptResponse}`,
            },
            {
              id: uuidv4(),
              content: "No information found. Please add papers first by uploading documents to create databases before querying.",
            },
          ];
        }

        // Extract content fields from each collection
        const responseOptions: ResponseOption[] = [];

        // First, add contextual GPT response
        try {
          const gptResponse = await generateContextualGPTResponse(query, chatMessages);
          responseOptions.push({
            id: uuidv4(),
            content: `**GPT Response (Conversational Context):** ${gptResponse}`,
          });
        } catch (error) {
          console.error("Error generating contextual GPT response:", error);
          responseOptions.push({
            id: uuidv4(),
            content: `**GPT Response:** Failed to generate contextual response. ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }

        if (data.collection_results) {
          // Iterate through each collection
          for (const [collectionName, collectionData] of Object.entries(
            data.collection_results
          )) {
            // Skip collections with errors
            if (
              collectionData &&
              "error" in collectionData &&
              collectionData.error
            ) {
              // Add an error option for this collection
              responseOptions.push({
                id: uuidv4(),
                content: `Collection ${collectionName}: Error - ${collectionData.error}`,
              });
              continue;
            }

            // Get contents from results if they exist
            if (
              collectionData?.results &&
              Array.isArray(collectionData.results)
            ) {
              const contents = collectionData.results
                .map((result) => {
                  // Extract content from metadata if it exists
                  return result.metadata?.content ?? null;
                })
                .filter((content): content is string => content !== null); // Type guard

              // Process this collection with OpenRouter using the ORIGINAL user query
              // (not the enhanced one, as the enhanced query was for database search)
              if (contents.length > 0) {
                try {
                  const openRouterResponse = await processWithOpenRouter(
                    query, // Use original query for final response generation
                    contents,
                    collectionName
                  );
                  responseOptions.push({
                    id: uuidv4(),
                    content: `${collectionName}: ${openRouterResponse}`,
                  });
                } catch (error) {
                  console.error(
                    `Error processing ${collectionName} with OpenRouter:`,
                    error
                  );
                  responseOptions.push({
                    id: uuidv4(),
                    content: `Collection ${collectionName}: Failed to process with AI. ${
                      error instanceof Error ? error.message : "Unknown error"
                    }`,
                  });
                }
              } else {
                responseOptions.push({
                  id: uuidv4(),
                  content: `Collection ${collectionName}: No content available`,
                });
              }
            } else {
              responseOptions.push({
                id: uuidv4(),
                content: `Collection ${collectionName}: No results found`,
              });
            }
          }
        }

        // If no valid responses were generated (other than GPT), add a fallback
        if (responseOptions.length === 1) { // Only GPT response exists
          responseOptions.push({
            id: uuidv4(),
            content: "No valid responses could be generated from the available collections.",
          });
        }

        // Update collection information
        setCollectionInfo({
          totalCollections: data.total_collections ?? 0,
          collectionNames: data.collection_names ?? [],
          userEmail: data.user_email ?? "",
        });

        return responseOptions;
      } catch (error) {
        console.error("Error fetching response options:", error);

        // Generate contextual GPT response even when API fails
        let gptResponse: string;
        try {
          gptResponse = await generateContextualGPTResponse(query, chatMessages);
        } catch (gptError) {
          console.error("Error generating GPT fallback response:", gptError);
          gptResponse = "Unable to generate response due to API connectivity issues.";
        }

        // Return fallback options in case of error
        return [
          {
            id: uuidv4(),
            content: `**GPT Response (No Database Access):** ${gptResponse}`,
          },
          {
            id: uuidv4(),
            content: `Error connecting to API: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
          {
            id: uuidv4(),
            content: "Would you like to try a different question or check your API server?",
          },
          {
            id: uuidv4(),
            content: "You can still test the interface while the API connection is being fixed.",
          },
        ];
      }
    },
    [processWithOpenRouter, activeChat, session, generateContextualGPTResponse, createEnhancedQuery, openRouterModel]
  );

  // Rank response options
  const moveResponseUp = useCallback((optionId: string) => {
    setRankedOptions((prev) => {
      const currentIndex = prev.indexOf(optionId);
      if (currentIndex <= 0) return prev; // Already at top or not found

      const newRanked = [...prev];
      const temp = newRanked[currentIndex]!;
      newRanked[currentIndex] = newRanked[currentIndex - 1]!;
      newRanked[currentIndex - 1] = temp;
      return newRanked;
    });
  }, []);

  const moveResponseDown = useCallback((optionId: string) => {
    setRankedOptions((prev) => {
      const currentIndex = prev.indexOf(optionId);
      if (currentIndex >= prev.length - 1 || currentIndex === -1) return prev; // Already at bottom or not found

      const newRanked = [...prev];
      const temp = newRanked[currentIndex]!;
      newRanked[currentIndex] = newRanked[currentIndex + 1]!;
      newRanked[currentIndex + 1] = temp;
      return newRanked;
    });
  }, []);

  const confirmRanking = useCallback(() => {
    if (rankedOptions.length === 0 || !chatId || !userId) return;

    const topRankedId = rankedOptions[0];
    const topRankedOption = responseOptions.find(
      (option) => option.id === topRankedId
    );

    if (topRankedOption && chatId && userId) {
      const rankingInfo = ` (Ranked 1st out of ${rankedOptions.length} responses)`;

      addMessageToChat(
        userId,
        chatId,
        "assistant",
        topRankedOption.content + rankingInfo
      );

      const updatedChat = getChat(userId, chatId);
      if (updatedChat) {
        setActiveChat(updatedChat);
      }

      const allChats = getAllChats(userId);
      const chatArray = Object.values(allChats).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      setChats(chatArray);

      setShowResponseOptions(false);
      setResponseOptions([]);
      setRankedOptions([]);
      setCollectionInfo(null); // Clear collection info
    }
  }, [rankedOptions, responseOptions, chatId, userId]);

  // Initialize ranking when switching to ranking mode
  const initializeRanking = useCallback(() => {
    if (responseMode === "ranking" && responseOptions.length > 0 && rankedOptions.length === 0) {
      setRankedOptions(responseOptions.map((option) => option.id));
    }
  }, [responseMode, responseOptions, rankedOptions]);

  // Effect to initialize ranking
  useEffect(() => {
    initializeRanking();
  }, [initializeRanking]);

  // Score a response option
  const scoreResponseOption = useCallback(
    (optionId: string, score: number) => {
      setScoredOptions((prev) => new Map(prev.set(optionId, score)));

      const allScored = responseOptions.every(
        (option) => scoredOptions.has(option.id) || option.id === optionId
      );

      if (allScored && responseMode === "scoring") {
        const scores = new Map(scoredOptions);
        scores.set(optionId, score);

        let highestScore = 0;
        let bestOptions: ResponseOption[] = [];

        responseOptions.forEach((option) => {
          const optionScore = scores.get(option.id) ?? 0;
          if (optionScore > highestScore) {
            highestScore = optionScore;
            bestOptions = [option];
          } else if (optionScore === highestScore && optionScore > 0) {
            bestOptions.push(option);
          }
        });

        const selectedOption = bestOptions[0];

        if (selectedOption && chatId && userId) {
          const scoreInfo =
            bestOptions.length > 1
              ? ` (Score: ${highestScore}/10 - tied with ${
                  bestOptions.length - 1
                } other${bestOptions.length > 2 ? "s" : ""})`
              : ` (Score: ${highestScore}/10)`;

          addMessageToChat(
            userId,
            chatId,
            "assistant",
            selectedOption.content + scoreInfo
          );

          const updatedChat = getChat(userId, chatId);
          if (updatedChat) {
            setActiveChat(updatedChat);
          }

          const allChats = getAllChats(userId);
          const chatArray = Object.values(allChats).sort(
            (a, b) => b.updatedAt - a.updatedAt
          );
          setChats(chatArray);

          setShowResponseOptions(false);
          setResponseOptions([]);
          setScoredOptions(new Map());
          setCollectionInfo(null); // Clear collection info
        }
      }
    },
    [responseOptions, scoredOptions, responseMode, chatId, userId]
  );

  // Select a response option (manual mode)
  const selectResponseOption = useCallback(
    (optionId: string) => {
      if (!chatId || !userId || !showResponseOptions || responseMode !== "manual")
        return;

      const selectedOption = responseOptions.find(
        (option) => option.id === optionId
      );
      if (!selectedOption) return;

      addMessageToChat(userId, chatId, "assistant", selectedOption.content);

      const updatedChat = getChat(userId, chatId);
      if (updatedChat) {
        setActiveChat(updatedChat);
      }

      const allChats = getAllChats(userId);
      const chatArray = Object.values(allChats).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      setChats(chatArray);

      setShowResponseOptions(false);
      setResponseOptions([]);
      setCollectionInfo(null); // Clear collection info
    },
    [chatId, userId, showResponseOptions, responseOptions, responseMode]
  );

  // Reset response options and scores when starting new interaction
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || !userId) return;
      setIsLoading(true);

      setScoredOptions(new Map());
      setRankedOptions([]);
      setCollectionInfo(null); // Reset collection info

      let currentChatId = chatId;

      // If no active chat, create a new one
      if (!currentChatId) {
        const newChat = createChat(userId, "How can I help you today?");
        currentChatId = newChat.id;
        setActiveChat(newChat);
        router.push(`/chat/${newChat.id}`);
      }

      // Add user message
      addMessageToChat(userId, currentChatId, "user", content);

      if (activeChat) {
        const updatedChat = getChat(userId, currentChatId);
        if (updatedChat) {
          setActiveChat(updatedChat);
        }
      }

      try {
        const options = await fetchResponseOptions(content);
        setResponseOptions(options);
        setShowResponseOptions(true);
      } catch (error) {
        console.error("Error in sendMessage:", error);
      } finally {
        setIsLoading(false);
      }

      setInputValue("");
    },
    [chatId, isLoading, router, userId, activeChat, fetchResponseOptions]
  );

  // Delete a chat
  const removeChat = useCallback(
    (id: string) => {
      if (!userId) return;

      deleteChat(userId, id);

      const allChats = getAllChats(userId);
      const chatArray = Object.values(allChats).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      setChats(chatArray);

      if (activeChat?.id === id) {
        if (chatArray.length > 0) {
          const nextChat = chatArray[0];
          if (nextChat) {
            setActiveChat(nextChat);
            router.push(`/chat/${nextChat.id}`);
          } else {
            setActiveChat(null);
            router.push("/");
          }
        } else {
          setActiveChat(null);
          router.push("/");
        }
      }
    },
    [activeChat, router, userId]
  );

  // Check if user is authenticated
  const isAuthenticated = !!session && !!userId;

  // Function to clear upload status (for when upload is truly completed)
  const clearUploadStatus = useCallback(() => {
    const clearedStatus = {
      isTracking: false,
      totalJobs: 0,
      completedJobs: 0,
      percentage: 0,
    };
    setUploadStatus(clearedStatus);
    if (typeof window !== "undefined" && userId) {
      localStorage.removeItem(`uploadStatus_${userId}`);
    }
  }, [userId]);

  return {
    chats,
    activeChat,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    startNewChat,
    removeChat,
    isAuthenticated,
    userId,
    responseOptions,
    showResponseOptions,
    selectResponseOption,
    responseMode,
    setResponseMode,
    scoreResponseOption,
    scoredOptions,
    rankedOptions,
    moveResponseUp,
    moveResponseDown,
    confirmRanking,

    // Expose the dropdown state and setter
    openRouterModel,
    setOpenRouterModel,

    // Expose collection information
    collectionInfo,

    // Expose upload status and functions
    uploadStatus,
    setUploadStatus,
    clearUploadStatus,
  };
};
