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

export type ResponseOption = {
  id: string;
  content: string;
  score?: number;
};

export type ResponseMode = "manual" | "scoring" | "ranking";

// API configuration
const API_CONFIG = {
  url: "https://57a8-38-70-220-253.ngrok-free.app/api/evaluate",
  collections: ["openai_paragraph_openai", "openai_fixed_length_openai"],
  model: "openai/gpt-3.5-turbo-0613"
};

// OpenRouter API configuration
const OPENROUTER_CONFIG = {
  url: "https://openrouter.ai/api/v1/chat/completions",
  model: "openai/gpt-3.5-turbo", // Default model
  // Use environment variable for the API key
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? ""
};

// For debugging
const logApiRequest = (url: string, payload: Record<string, unknown>) => {
  console.log(`Sending request to: ${url}`);
  console.log('Request payload:', JSON.stringify(payload, null, 2));
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
  
  const userId = session?.user?.email ?? '';
  
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [responseOptions, setResponseOptions] = useState<ResponseOption[]>([]);
  const [showResponseOptions, setShowResponseOptions] = useState(false);
  const [responseMode, setResponseMode] = useState<ResponseMode>("manual");
  const [scoredOptions, setScoredOptions] = useState<Map<string, number>>(new Map());
  const [rankedOptions, setRankedOptions] = useState<string[]>([]);
  
  // Track if initial load has happened
  const initialLoadComplete = useRef(false);
  
  const chatId = params?.chatId as string | undefined;
  
  // Load chats from storage - without activeChat as dependency to avoid loops
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
      // This allows for a state with no active chat
      
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
    
    // Update chats list without triggering navigation
    const allChats = getAllChats(userId);
    const chatArray = Object.values(allChats).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
    setChats(chatArray);
    
    // Navigate to the new chat
    router.push(`/chat/${newChat.id}`);
  }, [router, userId]);

  // Fetch response options from API
  const fetchResponseOptions = useCallback(async (query: string): Promise<ResponseOption[]> => {
    const payload = {
      query: query,
      collections: API_CONFIG.collections,
      db_path: null,
      model_name: API_CONFIG.model
    };
    
    logApiRequest(API_CONFIG.url, payload);
    
    try {
      const response = await fetch(API_CONFIG.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      console.log(`API response status: ${response.status}`);
      
      if (!response.ok) {
        console.error(`API request failed with status ${response.status}`);
        return [
          { id: uuidv4(), content: `Error: API request failed with status ${response.status}. Please check the server connection.` },
          { id: uuidv4(), content: "The API server might not be running or the endpoint might be incorrect." },
          { id: uuidv4(), content: "You can continue testing the interface while the backend issue is being resolved." }
        ];
      }
      
      const data = await response.json() as ApiResponse;
      console.log('API response data:', data);
      
      // Extract content fields from each collection
      const responseOptions: ResponseOption[] = [];
      
      if (data.collection_results) {
        // Iterate through each collection
        for (const [collectionName, collectionData] of Object.entries(data.collection_results)) {
          // Skip collections with errors
          if (collectionData && 'error' in collectionData && collectionData.error) {
            // Add an error option for this collection
            responseOptions.push({
              id: uuidv4(),
              content: `Collection ${collectionName}: Error - ${collectionData.error}`
            });
            continue;
          }
          
          // Get contents from results if they exist
          if (collectionData?.results && Array.isArray(collectionData.results)) {
            const contents = collectionData.results
              .map((result) => {
                // Extract content from metadata if it exists
                return result.metadata?.content ?? null;
              })
              .filter((content): content is string => content !== null); // Type guard to filter nulls
            
            // Process this collection with OpenRouter
            if (contents.length > 0) {
              try {
                const openRouterResponse = await processWithOpenRouter(query, contents, collectionName);
                responseOptions.push({
                  id: uuidv4(),
                  content: `${collectionName}: ${openRouterResponse}`
                });
              } catch (error) {
                console.error(`Error processing ${collectionName} with OpenRouter:`, error);
                responseOptions.push({
                  id: uuidv4(),
                  content: `Collection ${collectionName}: Failed to process with AI. ${error instanceof Error ? error.message : 'Unknown error'}`
                });
              }
            } else {
              responseOptions.push({
                id: uuidv4(),
                content: `Collection ${collectionName}: No content available`
              });
            }
          } else {
            responseOptions.push({
              id: uuidv4(),
              content: `Collection ${collectionName}: No results found`
            });
          }
        }
      }
      
      // If no valid responses were generated, add a fallback
      if (responseOptions.length === 0) {
        responseOptions.push({
          id: uuidv4(),
          content: "No valid responses could be generated from the available collections."
        });
      }
      
      return responseOptions;
    } catch (error) {
      console.error('Error fetching response options:', error);
      
      // Return fallback options in case of error
      return [
        { id: uuidv4(), content: `Error connecting to API: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { id: uuidv4(), content: "Would you like to try a different question or check your API server?" },
        { id: uuidv4(), content: "You can still test the interface while the API connection is being fixed." }
      ];
    }
  }, []);
  
  // Process collection content with OpenRouter
  const processWithOpenRouter = async (userQuery: string, contents: string[], collectionName: string): Promise<string> => {
    if (!OPENROUTER_CONFIG.apiKey) {
      return "Please add your OpenRouter API";
    }
    
    // Combine the content into a context string
    const context = contents.join("\n\n");
    
    // Prepare the message for OpenRouter
    const openRouterPayload = {
      model: OPENROUTER_CONFIG.model,
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant. Answer the user's question based ONLY on the following information from collection "${collectionName}":\n\n${context}\n\n Format your response with markdown: use **bold** for important points, bullet lists (•) for multiple items, and organize information in a readable format. If information is provided in numbered lists, preserve that structure.`
        },
        {
          role: "user",
          content: userQuery
        }
      ]
    };
    
    console.log(`Sending to OpenRouter (collection: ${collectionName}):`, openRouterPayload);
    
    const response = await fetch(OPENROUTER_CONFIG.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_CONFIG.apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Chat UI Demo"
      },
      body: JSON.stringify(openRouterPayload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json() as OpenRouterResponse;
    console.log(`OpenRouter response (collection: ${collectionName}):`, result);
    
    // Extract the assistant's response
    if (result.choices?.[0]?.message?.content) {
      return result.choices[0].message.content;
    }
    
    return "No response received from OpenRouter.";
  };
  
  // Rank response options
  const moveResponseUp = useCallback(
    (optionId: string) => {
      setRankedOptions(prev => {
        const currentIndex = prev.indexOf(optionId);
        if (currentIndex <= 0) return prev; // Already at top or not found
        
        const newRanked = [...prev];
        // Safe to use non-null assertion since we've checked bounds
        const temp = newRanked[currentIndex]!;
        newRanked[currentIndex] = newRanked[currentIndex - 1]!;
        newRanked[currentIndex - 1] = temp;
        return newRanked;
      });
    },
    []
  );

  const moveResponseDown = useCallback(
    (optionId: string) => {
      setRankedOptions(prev => {
        const currentIndex = prev.indexOf(optionId);
        if (currentIndex >= prev.length - 1 || currentIndex === -1) return prev; // Already at bottom or not found
        
        const newRanked = [...prev];
        // Safe to use non-null assertion since we've checked bounds
        const temp = newRanked[currentIndex]!;
        newRanked[currentIndex] = newRanked[currentIndex + 1]!;
        newRanked[currentIndex + 1] = temp;
        return newRanked;
      });
    },
    []
  );

  const confirmRanking = useCallback(() => {
    if (rankedOptions.length === 0 || !chatId || !userId) return;

    // Get the top-ranked response
    const topRankedId = rankedOptions[0];
    const topRankedOption = responseOptions.find(option => option.id === topRankedId);
    
    if (topRankedOption && chatId && userId) {
      // Add ranking information to the response
      const rankingInfo = ` (Ranked 1st out of ${rankedOptions.length} responses)`;
      
      addMessageToChat(userId, chatId, "assistant", topRankedOption.content + rankingInfo);
      
      // Update active chat
      const updatedChat = getChat(userId, chatId);
      if (updatedChat) {
        setActiveChat(updatedChat);
      }
      
      // Update chats list
      const allChats = getAllChats(userId);
      const chatArray = Object.values(allChats).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      setChats(chatArray);
      
      // Hide response options and clear ranking
      setShowResponseOptions(false);
      setResponseOptions([]);
      setRankedOptions([]);
    }
  }, [rankedOptions, responseOptions, chatId, userId]);

  // Initialize ranking when switching to ranking mode
  const initializeRanking = useCallback(() => {
    if (responseMode === "ranking" && responseOptions.length > 0 && rankedOptions.length === 0) {
      setRankedOptions(responseOptions.map(option => option.id));
    }
  }, [responseMode, responseOptions, rankedOptions]);

  // Effect to initialize ranking
  useEffect(() => {
    initializeRanking();
  }, [initializeRanking]);

  // Score a response option
  const scoreResponseOption = useCallback(
    (optionId: string, score: number) => {
      setScoredOptions(prev => new Map(prev.set(optionId, score)));
      
      // Check if all options are scored
      const allScored = responseOptions.every(option => 
        scoredOptions.has(option.id) || option.id === optionId
      );
      
      if (allScored && responseMode === "scoring") {
        // Automatically select the highest scored option
        const scores = new Map(scoredOptions);
        scores.set(optionId, score); // Include the current score
        
        let highestScore = 0;
        let bestOptions: ResponseOption[] = [];
        
        responseOptions.forEach(option => {
          const optionScore = scores.get(option.id) ?? 0;
          if (optionScore > highestScore) {
            highestScore = optionScore;
            bestOptions = [option];
          } else if (optionScore === highestScore && optionScore > 0) {
            bestOptions.push(option);
          }
        });
        
        // Tie-breaking: select the first one (by index) if there are ties
        const selectedOption = bestOptions[0];
        
        if (selectedOption && chatId && userId) {
          // Add the selected response to the chat with score info
          const scoreInfo = bestOptions.length > 1 
            ? ` (Score: ${highestScore}/10 - tied with ${bestOptions.length - 1} other${bestOptions.length > 2 ? 's' : ''})`
            : ` (Score: ${highestScore}/10)`;
          
          addMessageToChat(userId, chatId, "assistant", selectedOption.content + scoreInfo);
          
          // Update active chat
          const updatedChat = getChat(userId, chatId);
          if (updatedChat) {
            setActiveChat(updatedChat);
          }
          
          // Update chats list
          const allChats = getAllChats(userId);
          const chatArray = Object.values(allChats).sort(
            (a, b) => b.updatedAt - a.updatedAt
          );
          setChats(chatArray);
          
          // Hide response options and clear scores
          setShowResponseOptions(false);
          setResponseOptions([]);
          setScoredOptions(new Map());
        }
      }
    },
    [responseOptions, scoredOptions, responseMode, chatId, userId]
  );
  
  // Select a response option (for manual mode)
  const selectResponseOption = useCallback(
    (optionId: string) => {
      if (!chatId || !userId || !showResponseOptions || responseMode !== "manual") return;
      
      // Safe to use chatId at this point because we've checked it's not falsy
      const selectedOption = responseOptions.find(option => option.id === optionId);
      if (!selectedOption) return;
      
      // Add the selected response to the chat - chatId is guaranteed to be string here
      addMessageToChat(userId, chatId, "assistant", selectedOption.content);
      
      // Update active chat
      const updatedChat = getChat(userId, chatId);
      if (updatedChat) {
        setActiveChat(updatedChat);
      }
      
      // Update chats list
      const allChats = getAllChats(userId);
      const chatArray = Object.values(allChats).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      setChats(chatArray);
      
      // Hide response options
      setShowResponseOptions(false);
      setResponseOptions([]);
    },
    [chatId, userId, showResponseOptions, responseOptions, responseMode]
  );
  
  // Reset response options and scores when starting new interaction
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || !userId) return;
      setIsLoading(true);
      
      // Clear previous scores and rankings
      setScoredOptions(new Map());
      setRankedOptions([]);
      
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
      
      // Update active chat manually to avoid unnecessary reloads
      if (activeChat) {
        const updatedChat = getChat(userId, currentChatId);
        if (updatedChat) {
          setActiveChat(updatedChat);
        }
      }
      
      try {
        // Fetch responses from API
        const options = await fetchResponseOptions(content);
        setResponseOptions(options);
        setShowResponseOptions(true);
      } catch (error) {
        console.error('Error in sendMessage:', error);
      } finally {
        setIsLoading(false);
      }
      
      // Clear input
      setInputValue("");
    },
    [chatId, isLoading, router, userId, activeChat, fetchResponseOptions]
  );
  
  // Delete a chat
  const removeChat = useCallback(
    (id: string) => {
      if (!userId) return;
      
      deleteChat(userId, id);
      
      // Update chats list
      const allChats = getAllChats(userId);
      const chatArray = Object.values(allChats).sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      setChats(chatArray);
      
      // If active chat is deleted
      if (activeChat?.id === id) {
        // If there are other chats, select the most recent one
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
          // No chats left, clear active chat and go to empty state
          setActiveChat(null);
          router.push("/");
        }
      }
    },
    [activeChat, router, userId]
  );
  
  // Check if user is authenticated
  const isAuthenticated = !!session && !!userId;
  
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
  };
}; 