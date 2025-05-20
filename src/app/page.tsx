"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { Send, Menu, Plus } from "lucide-react";

// Mock responses for the chat
const mockResponses: string[] = [
  "Hello! How can I help you today?",
  "That's an interesting question. Let me think about it...",
  "Based on my knowledge, the answer is quite complex but I'll try to explain it simply.",
  "I don't have that information at the moment, but I can suggest some resources.",
  "That's a great point! I hadn't considered that perspective before.",
];

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi there! How can I help you today?" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) return;
    
    // Add user message
    const userMessage: Message = { role: "user", content: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    
    // Clear input
    setInputValue("");
    setIsLoading(true);
    
    // Mock response after a short delay
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * mockResponses.length);
      const responseContent: string = mockResponses[randomIndex] || "I'm not sure how to respond to that.";
      const assistantMessage: Message = { 
        role: "assistant", 
        content: responseContent
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const startNewChat = () => {
    setMessages([{ role: "assistant", content: "How can I help you today?" }]);
    setInputValue("");
  };

  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  return (
    <div className="flex h-screen bg-[#0f0f0f]">
      {/* Sidebar - conditionally shown */}
      {showSidebar && (
        <div className="w-[260px] border-r border-[#2a2a2a] bg-black flex-shrink-0">
          <div className="h-full flex flex-col">
            <div className="p-4">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 bg-transparent border-[#2a2a2a] hover:bg-[#2a2a2a]"
                onClick={startNewChat}
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
            
            <div className="flex-1 overflow-auto py-2 px-2">
              <div className="space-y-1">
                {[
                  { id: "1", title: "Project Discussion", date: "Today" },
                  { id: "2", title: "Travel Planning", date: "Yesterday" },
                  { id: "3", title: "Technical Support", date: "3 days ago" },
                  { id: "4", title: "Recipe Ideas", date: "1 week ago" },
                ].map((chat) => (
                  <Button 
                    key={chat.id}
                    variant="ghost" 
                    className="w-full justify-start text-sm font-normal hover:bg-[#2a2a2a]"
                  >
                    <div className="flex-1 truncate text-left">
                      {chat.title}
                      <div className="text-xs text-zinc-400">{chat.date}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 h-full bg-[#0a0a0a]">
        {/* Header */}
        <header className="flex items-center h-12 px-4 border-b border-[#2a2a2a] bg-[#0a0a0a]">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleSidebar} 
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
          <h1 className="font-medium text-sm">New Chat</h1>
          <div className="ml-auto flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={startNewChat}
              className="text-xs bg-transparent border-[#2a2a2a] hover:bg-[#2a2a2a]"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Chat
            </Button>
          </div>
        </header>
        
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-6 px-4 lg:px-16">
            <div className="max-w-3xl mx-auto space-y-8">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "group",
                    message.role === "user" ? "text-right" : ""
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="flex items-start">
                      <div className="shrink-0 w-9 h-9 bg-[#1a7f64] rounded-full flex items-center justify-center mr-4 text-sm font-medium">
                        AI
                      </div>
                      <div className="prose prose-invert max-w-none">
                        <p>{message.content}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-right">
                      <div className="inline-block bg-[#343541] px-4 py-2 rounded-2xl text-left">
                        {message.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            
              {isLoading && (
                <div className="flex items-start">
                  <div className="shrink-0 w-9 h-9 bg-[#1a7f64] rounded-full flex items-center justify-center mr-4 text-sm font-medium">
                    AI
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Input Form */}
          <div className="border-t border-[#2a2a2a] p-4">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="flex space-x-2 relative">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Send a message..."
                    className="py-6 px-4 pr-10 bg-[#343541] text-[#ececf1] border-[#343541] focus-visible:ring-0 focus-visible:ring-offset-0 h-auto text-sm"
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon"
                  disabled={!inputValue.trim() || isLoading}
                  className="bg-[#1a7f64] hover:bg-[#18735a] self-stretch"
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 