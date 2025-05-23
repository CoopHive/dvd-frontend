"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
};

// API configuration
const API_CONFIG = {
  url: "http://localhost:3001/api/evaluate",
  collections: ["openai_paragraph_openai", "openai_fixed_length_openai"],
  model: "openai/gpt-3.5-turbo-0613"
};

// OpenRouter API configuration
const OPENROUTER_CONFIG = {
  url: "https://openrouter.ai/api/v1/chat/completions",
  model: "openai/gpt-3.5-turbo", // Default model
  // Use environment variable for the API key
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || ""
};

// For debugging
const logApiRequest = (url: string, payload: any) => {
  console.log(`Sending request to: ${url}`);
  console.log('Request payload:', JSON.stringify(payload, null, 2));
};

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
        }
      } else if (chatArray.length > 0 && chatArray[0]) {
        // If no chat is active but we have chats, select the most recent one
        // Do not navigate here to avoid loops
        setActiveChat(chatArray[0]);
      }
      
      initialLoadComplete.current = true;
    }
  }, [userId, chatId]);
  
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
      
      const data = await response.json();
      console.log('API response data:', data);
      
      // Extract content fields from each collection
      const contentByCollection: Record<string, any> = {};
      const responseOptions: ResponseOption[] = [];
      
      if (data.collection_results) {
        // Iterate through each collection
        for (const [collectionName, collectionData] of Object.entries(data.collection_results)) {
          // Skip collections with errors
          if (typeof collectionData === 'object' && collectionData !== null && 'error' in collectionData) {
            contentByCollection[collectionName] = { error: (collectionData as { error: string }).error };
            // Add an error option for this collection
            responseOptions.push({
              id: uuidv4(),
              content: `Collection ${collectionName}: Error - ${(collectionData as { error: string }).error}`
            });
            continue;
          }
          
          // Get contents from results if they exist
          if (
            typeof collectionData === 'object' && 
            collectionData !== null && 
            'results' in collectionData && 
            Array.isArray((collectionData as { results: any[] }).results)
          ) {
            const contents = ((collectionData as { results: any[] }).results)
              .map((result: any) => {
                // Extract content from metadata if it exists
                if (result.metadata && result.metadata.content) {
                  return result.metadata.content;
                }
                return null;
              })
              .filter((content: any) => content !== null); // Remove null entries
            
            contentByCollection[collectionName] = contents;
            
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
            contentByCollection[collectionName] = [];
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
    
    const result = await response.json();
    console.log(`OpenRouter response (collection: ${collectionName}):`, result);
    
    // Extract the assistant's response
    if (result.choices && result.choices.length > 0 && result.choices[0].message) {
      return result.choices[0].message.content;
    }
    
    return "No response received from OpenRouter.";
  };
  
  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading || !userId) return;
      setIsLoading(true);
      
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
  
  // Select a response option
  const selectResponseOption = useCallback(
    (optionId: string) => {
      if (!chatId || !userId || !showResponseOptions) return;
      
      // Safe to use chatId at this point because we've checked it's not falsy
      const selectedOption = responseOptions.find(option => option.id === optionId);
      if (!selectedOption) return;
      
      // Add the selected response to the chat
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
    [chatId, userId, showResponseOptions, responseOptions]
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
      
      // If active chat is deleted, set to null
      if (activeChat?.id === id) {
        setActiveChat(null);
        // Navigate to home
        router.push("/");
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
  };
}; 