"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react"; 
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { Send, Menu, Plus, LogOut, Trash2 } from "lucide-react";
import { useChat } from "~/hooks/use-chat";
import { formatDistanceToNow } from "date-fns";

export default function ChatInterface() {
  const {
    chats,
    activeChat,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    startNewChat,
    removeChat,
  } = useChat();
  
  const [showSidebar, setShowSidebar] = useState(true);
  
  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };
  
  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" });
  };

  const navigateToChat = (chatId: string) => {
    window.history.pushState({}, "", `/chat/${chatId}`);
    window.location.reload();
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
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={cn(
                      "flex items-center group rounded-md hover:bg-[#2a2a2a] transition-colors",
                      activeChat?.id === chat.id && "bg-[#2a2a2a]"
                    )}
                  >
                    <div 
                      className="flex-1 py-2 px-3 cursor-pointer"
                      onClick={() => navigateToChat(chat.id)}
                    >
                      <div className="truncate">
                        <div className="text-sm">{chat.title}</div>
                        <div className="text-xs text-zinc-400">
                          {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 ml-1 mr-1"
                      onClick={() => removeChat(chat.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-[#2a2a2a]">
              <Button
                variant="ghost"
                className="w-full justify-start text-sm gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
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
          <h1 className="font-medium text-sm">
            {activeChat?.title || "New Chat"}
          </h1>
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
              {activeChat?.messages?.map((message) => (
                <div
                  key={message.id}
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
                    <div
                      className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* If no messages */}
              {activeChat?.messages?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <h2 className="text-xl font-medium">Start a new conversation</h2>
                  <p className="text-zinc-400 mt-2">Send a message to get started</p>
                </div>
              )}
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