"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react"; 
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { Send, Menu, Plus, LogOut, Trash2, User, Check } from "lucide-react";
import { useChat } from "~/hooks/use-chat";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    responseOptions,
    showResponseOptions,
    selectResponseOption,
  } = useChat();
  
  const { data: session } = useSession();
  const [showSidebar, setShowSidebar] = useState(true);
  
  const toggleSidebar = () => {
    setShowSidebar((prev) => !prev);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(inputValue);
  };
  
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
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
                className="w-full justify-start gap-2 bg-[#2a2a2a] border-none hover:bg-[#343541] text-zinc-300"
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
            {activeChat?.title ?? "New Chat"}
          </h1>
          <div className="ml-auto flex items-center space-x-2">
            {session?.user && (
              <div className="flex items-center mr-4">
                <Avatar className="h-7 w-7 mr-2">
                  {session.user.image ? (
                    <AvatarImage src={session.user.image} alt={session.user.name ?? 'User'} />
                  ) : (
                    <AvatarFallback className="bg-[#1a7f64]">
                      <User className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="text-xs text-zinc-300">
                  {session.user.name ?? session.user.email}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={startNewChat}
              className="text-xs bg-[#2a2a2a] border-none hover:bg-[#343541] text-zinc-300"
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
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            // Add custom styling for markdown elements
                            strong: ({node, ...props}) => <span className="font-bold text-[#4fd1c5]" {...props} />,
                            h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-md font-bold mt-3 mb-1" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="my-1" {...props} />,
                            p: ({node, ...props}) => <p className="my-2" {...props} />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
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
              
              {/* AI Response Options */}
              {showResponseOptions && responseOptions.length > 0 && (
                <div className="flex items-start">
                  <div className="shrink-0 w-9 h-9 bg-[#1a7f64] rounded-full flex items-center justify-center mr-4 text-sm font-medium">
                    AI
                  </div>
                  <div className="flex flex-col space-y-3 w-full">
                    {responseOptions.map((option) => (
                      <div 
                        key={option.id}
                        className="bg-[#2a2a2a] hover:bg-[#3a3a3a] px-4 py-3 rounded-xl cursor-pointer transition-colors flex items-start group"
                        onClick={() => selectResponseOption(option.id)}
                      >
                        <div className="prose prose-invert max-w-none flex-1">
                          {option.content.startsWith('API Raw Data:') ? (
                            <pre className="text-xs overflow-auto max-h-[400px] p-2 bg-[#1e1e1e] rounded">
                              {option.content.replace('API Raw Data: ', '')}
                            </pre>
                          ) : option.content.startsWith('Collection ') && option.content.includes(': Error') ? (
                            <p>{option.content}</p>
                          ) : (
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                // Add custom styling for markdown elements
                                strong: ({node, ...props}) => <span className="font-bold text-[#4fd1c5]" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-3 mb-2" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-md font-bold mt-3 mb-1" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="my-1" {...props} />,
                                p: ({node, ...props}) => <p className="my-2" {...props} />,
                              }}
                            >
                              {option.content}
                            </ReactMarkdown>
                          )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 mt-1">
                          <Check className="h-4 w-4 text-[#1a7f64]" />
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-zinc-500 italic mt-1 pl-1">
                      Choose one of the responses above
                    </div>
                  </div>
                </div>
              )}
              
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
              {activeChat?.messages?.length === 0 && !isLoading && !showResponseOptions && (
                <div className="flex flex-col items-center justify-center py-12">
                  <h2 className="text-xl font-medium">Start a new conversation</h2>
                  <p className="text-zinc-400 mt-2">Send a message to get started</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Input Form */}
          <div className="border-t border-[#2a2a2a] p-4 pb-6 bg-gradient-to-b from-[#0a0a0a] to-[#111111]">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="flex items-end space-x-2 relative">
                <div className="flex-1 relative shadow-lg">
                  <Input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Send a message..."
                    className="py-6 px-5 pr-12 bg-[#2a2a2a] text-[#ececf1] border-none rounded-2xl focus-visible:ring-1 focus-visible:ring-[#1a7f64] focus-visible:ring-offset-0 h-auto text-sm shadow-inner"
                    disabled={isLoading || showResponseOptions}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#2d2d2d] to-[#2a2a2a] rounded-2xl opacity-30 pointer-events-none"></div>
                </div>
                <Button
                  type="submit"
                  size="icon"
                  disabled={!inputValue.trim() || isLoading || showResponseOptions}
                  className="bg-[#1a7f64] hover:bg-[#18735a] rounded-full h-12 w-12 shadow-md"
                >
                  <Send className="h-5 w-5" />
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