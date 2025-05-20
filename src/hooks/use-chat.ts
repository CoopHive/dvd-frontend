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
  
  // Mock responses for the chat - wrapped in useMemo to avoid dependency changes
  const mockResponses = useMemo(() => [
    "Hello! How can I help you today?",
    "That's an interesting question. Let me think about it...",
    "Based on my knowledge, the answer is quite complex but I'll try to explain it simply.",
    "I don't have that information at the moment, but I can suggest some resources.",
    "That's a great point! I hadn't considered that perspective before.",
    "Let me break this down into simpler parts so it's easier to understand.",
    "This is a common question. Here's my take on it...",
    "There are multiple ways to approach this. One option is...",
    "I understand your concern. Here's what I recommend...",
    "From my analysis, the best approach would be to..."
  ], []);
  
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

  // Generate multiple response options
  const generateResponseOptions = useCallback(() => {
    // Get 3 unique random responses
    const options: ResponseOption[] = [];
    const usedIndices = new Set<number>();
    
    while (options.length < 3) {
      const randomIndex = Math.floor(Math.random() * mockResponses.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        options.push({
          id: uuidv4(),
          content: mockResponses[randomIndex] ?? "I'm not sure how to respond to that."
        });
      }
    }
    
    return options;
  }, [mockResponses]);
  
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
      
      // Simulate AI thinking
      setTimeout(() => {
        // Generate multiple response options
        const options = generateResponseOptions();
        setResponseOptions(options);
        setShowResponseOptions(true);
        setIsLoading(false);
      }, 1000);
      
      // Clear input
      setInputValue("");
    },
    [chatId, isLoading, router, userId, activeChat, generateResponseOptions]
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