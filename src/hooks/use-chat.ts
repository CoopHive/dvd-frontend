"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useSession } from "next-auth/react";
import type { Chat, Message } from "~/lib/types";
import {
  getAllChats,
  getChat,
  createChat,
  addMessageToChat,
  deleteChat,
} from "~/lib/chat-storage";

export const useChat = () => {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  
  const userId = session?.user?.email || '';
  
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  // Track if initial load has happened
  const initialLoadComplete = useRef(false);
  
  const chatId = params?.chatId as string | undefined;
  
  // Mock responses for the chat
  const mockResponses: string[] = [
    "Hello! How can I help you today?",
    "That's an interesting question. Let me think about it...",
    "Based on my knowledge, the answer is quite complex but I'll try to explain it simply.",
    "I don't have that information at the moment, but I can suggest some resources.",
    "That's a great point! I hadn't considered that perspective before.",
  ];
  
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
      } else if (chatArray.length > 0) {
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
        // Add AI response
        const randomIndex = Math.floor(Math.random() * mockResponses.length);
        const responseContent = mockResponses[randomIndex] || "I'm not sure how to respond to that.";
        
        if (currentChatId) {
          addMessageToChat(userId, currentChatId, "assistant", responseContent);
          
          // Update active chat manually
          const updatedChat = getChat(userId, currentChatId);
          if (updatedChat) {
            setActiveChat(updatedChat);
          }
          
          // Update chats list
          const allChats = getAllChats(userId);
          const chatArray = Object.values(allChats).sort(
            (a, b) => b.updatedAt - a.updatedAt
          );
          setChats(chatArray);
        }
        
        setIsLoading(false);
      }, 1000);
      
      // Clear input
      setInputValue("");
    },
    [chatId, isLoading, router, mockResponses, userId, activeChat]
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
  };
}; 