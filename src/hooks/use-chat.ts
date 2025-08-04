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

// Default OpenRouter prompt template
export const DEFAULT_OPENROUTER_PROMPT = `You are an expert research assistant analyzing scientific documents. Your task is to provide accurate, well-structured answers based EXCLUSIVELY on the information provided from collection "{collectionName}".

**CRITICAL GUIDELINES:**
• Base your response ONLY on the provided context - never use external knowledge
• If the context doesn't contain sufficient information to answer the question, explicitly state this
• Clearly distinguish between direct facts from the documents and any logical inferences
• Preserve the scientific accuracy and terminology from the source material

**CITATION REQUIREMENTS:**
• Use inline citations throughout your response in the format [1], [2], [3], etc.
• Each unique source should have its own citation number
• When referencing information from a source, immediately follow with the appropriate citation number
• Create a "References" section at the end listing all sources with their full citations
• Extract the citation information from the "Source:" lines in the provided content

**RESPONSE FORMATTING:**
• Use **bold** for key findings, important terms, and main conclusions
• Use bullet points (•) for lists, multiple findings, or step-by-step information
• Use numbered lists (1., 2., 3.) when describing processes, methodologies, or ranked information
• Use > blockquotes for direct quotes from the papers (with inline citations)
• Organize information hierarchically with clear sections when appropriate
• End with a "References" section listing all cited sources

**CONTENT STRUCTURE:**
1. Lead with the most relevant and direct answer to the question (with citations)
2. Support with specific evidence, data, or findings from the documents (with citations)
3. Include relevant context that helps understand the main answer (with citations)
4. Note any limitations or gaps in the available information
5. Provide complete "References" section at the end

**HANDLING UNCERTAINTY:**
• If information is incomplete: "Based on the available documents, [partial answer] [citation], however more information would be needed to fully address [specific aspect]"
• If no relevant information exists: "The provided documents from collection {collectionName} do not contain information about [specific topic]"
• If information conflicts: Present both perspectives clearly with their respective citations and note the discrepancy

Context from collection "{collectionName}":
{context}

Provide a comprehensive, accurate response with proper inline citations and a complete references section at the end.`;

export type ResponseOption = {
  id: string;
  content: string;
  score?: number;
};

export type ResponseMode = "manual" | "scoring" | "ranking";

// Type definitions for API responses
interface CollectionResult {
  results?: Array<{
    metadata?: {
      content?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface ApiResponse {
  total_collections?: number;
  collection_names?: string[];
  user_email?: string;
  collection_results?: Record<string, CollectionResult>;
}

// OpenRouter API response interface
interface OpenRouterApiResponse {
  content?: string;
  success?: boolean;
  error?: string;
}

export const useChat = (selectedDatabase?: string) => {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();

  const userId = session?.user?.email ?? "";

  // Use selectedDatabase if provided, otherwise fall back to userId
  const targetDatabase = selectedDatabase ?? userId;

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

  // Custom OpenRouter prompt - persist in localStorage
  const [customOpenRouterPrompt, setCustomOpenRouterPrompt] = useState<string>(() => {
    if (typeof window !== "undefined" && userId) {
      const stored = localStorage.getItem(`customOpenRouterPrompt_${userId}`);
      if (stored) {
        try {
          return JSON.parse(stored) as string;
        } catch (e) {
          console.error("Error parsing stored custom prompt:", e);
          return DEFAULT_OPENROUTER_PROMPT;
        }
      }
    }
    return DEFAULT_OPENROUTER_PROMPT;
  });

  // Save custom prompt to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && userId) {
      localStorage.setItem(`customOpenRouterPrompt_${userId}`, JSON.stringify(customOpenRouterPrompt));
    }
  }, [customOpenRouterPrompt, userId]);

  // Debug logging for model changes
  useEffect(() => {
    console.log(`OpenRouter model changed to: ${openRouterModel}`);
  }, [openRouterModel]);

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


  // Process collection content with OpenRouter via backend API
  const processWithOpenRouter = useCallback(async (
    userQuery: string,
    contents: string[],
    collectionName: string
  ): Promise<string> => {
    try {
      const response = await fetch("/api/openrouter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: 'process',
          model: openRouterModel,
          userQuery,
          contents,
          collectionName,
          customPrompt: customOpenRouterPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as OpenRouterApiResponse;
        throw new Error(errorData.error ?? `HTTP ${response.status}`);
      }

      const result = await response.json() as OpenRouterApiResponse;
      return result.content ?? "No response received from OpenRouter.";
    } catch (error) {
      console.error(`Error processing ${collectionName} with OpenRouter:`, error);
      throw error;
    }
  }, [openRouterModel, customOpenRouterPrompt]);

  // Create enhanced query using chat context via backend API
  const createEnhancedQuery = useCallback(async (
    userQuery: string,
    chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> => {
    // If there are no previous messages, just return the original query
    if (chatMessages.length === 0) {
      return userQuery;
    }

    try {
      console.log("Creating enhanced query with context...");
      console.log(`Using OpenRouter model: ${openRouterModel}`);
      
      const response = await fetch("/api/openrouter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: 'enhance',
          model: openRouterModel,
          userQuery,
          chatMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as OpenRouterApiResponse;
        console.error(`Query enhancement failed (${response.status}): ${errorData.error}`);
        return userQuery; // Fall back to original query
      }

      const result = await response.json() as OpenRouterApiResponse;
      
      if (result.content) {
        const enhancedQuery: string = result.content.trim();
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

  // Generate contextual GPT response without RAG via backend API
  const generateContextualGPTResponse = useCallback(async (
    userQuery: string,
    chatMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> => {
    try {
      console.log("Generating contextual GPT response...");
      console.log(`Using OpenRouter model: ${openRouterModel}`);
      
      const response = await fetch("/api/openrouter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: 'contextual',
          model: openRouterModel,
          userQuery,
          chatMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as OpenRouterApiResponse;
        throw new Error(errorData.error ?? `HTTP ${response.status}`);
      }

      const result = await response.json() as OpenRouterApiResponse;
      
      if (result.content) {
        return result.content;
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
        user_email: targetDatabase, // Use selected database email
      };

      // Use light server for evaluation operations
      const evaluateUrl = `${API_CONFIG.database.url}${API_CONFIG.database.endpoints.evaluate}`;

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

        // Prepare all OpenRouter calls to run in parallel
        const openRouterCalls: Promise<{ id: string; content: string }>[] = [];

        // First, add contextual GPT response call
        openRouterCalls.push(
          generateContextualGPTResponse(query, chatMessages)
            .then(gptResponse => ({
              id: uuidv4(),
              content: `**GPT Response (Conversational Context):** ${gptResponse}`,
            }))
            .catch(error => {
              console.error("Error generating contextual GPT response:", error);
              return {
                id: uuidv4(),
                content: `**GPT Response:** Failed to generate contextual response. ${
                  error instanceof Error ? error.message : "Unknown error"
                }`,
              };
            })
        );

        // Then add all collection processing calls
        for (const [collectionName, collectionData] of Object.entries(data.collection_results ?? {})) {
          if (collectionData && typeof collectionData === 'object' && 'results' in collectionData && collectionData.results) {
            const contents = collectionData.results
              .map((result) => {
                // Extract content and citation from metadata if they exist
                const content = result.metadata?.content ?? null;
                const citation = result.metadata?.citation ?? null;
                
                if (content) {
                  // Format content with citation if available
                  const contentWithCitation = citation && typeof citation === 'string'
                    ? `${content}\n\nSource: ${citation}`
                    : `${content}`;
                  return contentWithCitation;
                }
                return null;
              })
              .filter((content): content is string => content !== null); // Type guard

            // Process this collection with OpenRouter using the ORIGINAL user query
            // (not the enhanced one, as the enhanced query was for database search)
            if (contents.length > 0) {
              openRouterCalls.push(
                processWithOpenRouter(query, contents, collectionName)
                  .then(openRouterResponse => ({
                    id: uuidv4(),
                    content: `${collectionName}: ${openRouterResponse}`,
                  }))
                  .catch(error => {
                    console.error(`Error processing ${collectionName} with OpenRouter:`, error);
                    return {
                      id: uuidv4(),
                      content: `Collection ${collectionName}: Failed to process with AI. ${
                        error instanceof Error ? error.message : "Unknown error"
                      }`,
                    };
                  })
              );
            } else {
              // Add non-async option for collections with no content
              responseOptions.push({
                id: uuidv4(),
                content: `Collection ${collectionName}: No content available`,
              });
            }
          } else {
            // Add non-async option for collections with no results
            responseOptions.push({
              id: uuidv4(),
              content: `Collection ${collectionName}: No results found`,
            });
          }
        }

        // Execute all OpenRouter calls in parallel
        console.log(`Executing ${openRouterCalls.length} OpenRouter calls in parallel...`);
        const parallelResults = await Promise.allSettled(openRouterCalls);
        
        // Process parallel results
        parallelResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            responseOptions.push(result.value);
          } else {
            console.error("Parallel OpenRouter call failed:", result.reason);
            responseOptions.push({
              id: uuidv4(),
              content: `Error: Failed to process response. ${result.reason}`,
            });
          }
        });

        // If no valid responses were generated, add a fallback
        if (responseOptions.length === 0) {
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
    [processWithOpenRouter, activeChat, generateContextualGPTResponse, createEnhancedQuery, openRouterModel, targetDatabase]
  );

  // Store evaluation data to backend
  const storeEvaluationData = useCallback(
    async (
      mode: ResponseMode,
      selectedOptionId: string,
      options: ResponseOption[],
      query: string,
      scores?: Map<string, number> // Add scores parameter
    ) => {
      if (!session?.user?.email || !chatId) return;

      try {
        // Prepare options with mode-specific data
        const formattedOptions = options.map((option) => {
          const baseOption = {
            id: option.id,
            content: option.content,
            collection_name: option.content.split(":")[0] ?? undefined,
          };

          if (mode === "scoring") {
            return {
              ...baseOption,
              score: scores ? scores.get(option.id) ?? 0 : scoredOptions.get(option.id) ?? 0,
            };
          } else if (mode === "ranking") {
            const rankIndex = rankedOptions.indexOf(option.id);
            return {
              ...baseOption,
              rank: rankIndex >= 0 ? rankIndex + 1 : options.length,
            };
          }

          return baseOption;
        });

        // Send to backend
        const response = await fetch(`${API_CONFIG.database.url}/api/evaluation/store`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_email: session.user.email,
            query,
            mode,
            options: formattedOptions,
            selected_option_id: selectedOptionId,
            chat_id: chatId,
            timestamp: Date.now() / 1000,
            metadata: {
              model: openRouterModel,
              total_collections: collectionInfo?.totalCollections ?? 0,
              collection_names: collectionInfo?.collectionNames ?? [],
            },
          }),
        });

        if (!response.ok) {
          console.error("Failed to store evaluation data:", await response.text());
        } else {
          const result = await response.json() as { success: boolean; evaluation_id: string; message: string };
          console.log("Evaluation stored:", result);
        }
      } catch (error) {
        console.error("Error storing evaluation data:", error);
      }
    },
    [session, chatId, scoredOptions, rankedOptions, openRouterModel, collectionInfo]
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

      // Store evaluation data before clearing
      const currentQuery = activeChat?.messages
        .filter(msg => msg.role === 'user')
        .pop()?.content ?? "";
      
      void storeEvaluationData('ranking', topRankedId!, responseOptions, currentQuery);

      setShowResponseOptions(false);
      setResponseOptions([]);
      setRankedOptions([]);
      setCollectionInfo(null); // Clear collection info
    }
  }, [rankedOptions, responseOptions, chatId, userId, activeChat, storeEvaluationData]);

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

          // Store evaluation data before clearing
          const currentQuery = activeChat?.messages
            .filter(msg => msg.role === 'user')
            .pop()?.content ?? "";
          
          if (selectedOption) {
            void storeEvaluationData('scoring', selectedOption.id, responseOptions, currentQuery, scores);
          }

          setShowResponseOptions(false);
          setResponseOptions([]);
          setScoredOptions(new Map());
          setCollectionInfo(null); // Clear collection info
        }
      }
    },
    [responseOptions, scoredOptions, responseMode, chatId, userId, activeChat, storeEvaluationData]
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

      // Store evaluation data before clearing
      const currentQuery = activeChat?.messages
        .filter(msg => msg.role === 'user')
        .pop()?.content ?? "";
      
      void storeEvaluationData('manual', optionId, responseOptions, currentQuery);

      setShowResponseOptions(false);
      setResponseOptions([]);
      setCollectionInfo(null); // Clear collection info
    },
    [chatId, userId, showResponseOptions, responseOptions, responseMode, activeChat, storeEvaluationData]
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

    // Expose custom prompt state and setter
    customOpenRouterPrompt,
    setCustomOpenRouterPrompt,
  };
};
