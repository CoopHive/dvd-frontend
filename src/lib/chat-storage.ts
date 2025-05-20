import { v4 as uuidv4 } from 'uuid';
import type { Chat, Message, UserChats } from './types';

// Get user-specific storage key
function getUserStorageKey(userId: string): string {
  return `user_chats_${userId}`;
}

// Function to get all chats for a specific user
export function getAllChats(userId: string): UserChats {
  if (typeof window === 'undefined' || !userId) return {};
  
  const storageKey = getUserStorageKey(userId);
  const storedChats = localStorage.getItem(storageKey);
  
  if (!storedChats) return {};
  
  try {
    return JSON.parse(storedChats) as UserChats;
  } catch (error) {
    console.error('Failed to parse chats from localStorage:', error);
    return {};
  }
}

// Function to get a single chat by ID for a specific user
export function getChat(userId: string, chatId: string): Chat | null {
  const chats = getAllChats(userId);
  return chats[chatId] || null;
}

// Function to create a new chat for a specific user
export function createChat(userId: string, initialMessage?: string): Chat {
  const chatId = uuidv4();
  const now = Date.now();
  
  const newChat: Chat = {
    id: chatId,
    title: "New Conversation",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  
  if (initialMessage) {
    const message: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: initialMessage,
      timestamp: now,
    };
    newChat.messages.push(message);
  }
  
  const chats = getAllChats(userId);
  chats[chatId] = newChat;
  saveChats(userId, chats);
  
  return newChat;
}

// Function to add a message to a chat for a specific user
export function addMessageToChat(userId: string, chatId: string, role: 'user' | 'assistant', content: string): Chat | null {
  const chats = getAllChats(userId);
  const chat = chats[chatId];
  
  if (!chat) return null;
  
  const now = Date.now();
  const message: Message = {
    id: uuidv4(),
    role,
    content,
    timestamp: now,
  };
  
  chat.messages.push(message);
  chat.updatedAt = now;
  
  // Update chat title based on first user message if it's still default
  if (chat.title === "New Conversation" && role === 'user' && chat.messages.filter(m => m.role === 'user').length === 1) {
    chat.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
  }
  
  saveChats(userId, chats);
  return chat;
}

// Function to delete a chat for a specific user
export function deleteChat(userId: string, chatId: string): boolean {
  const chats = getAllChats(userId);
  
  if (!chats[chatId]) return false;
  
  delete chats[chatId];
  saveChats(userId, chats);
  
  return true;
}

// Helper function to save chats to localStorage for a specific user
function saveChats(userId: string, chats: UserChats): void {
  if (typeof window === 'undefined' || !userId) return;
  
  const storageKey = getUserStorageKey(userId);
  localStorage.setItem(storageKey, JSON.stringify(chats));
} 