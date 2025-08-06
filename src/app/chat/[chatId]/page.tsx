"use client";

import { redirect } from "next/navigation";
import { useNextAuth } from "~/hooks/use-nextauth";
import ChatInterface from "~/components/chat-interface";

export default function ChatPage() {
  const { isAuthenticated, isLoading } = useNextAuth();
  
  // If the user is not authenticated, redirect to signin page
  if (!isLoading && !isAuthenticated) {
    redirect("/auth/signin");
  }
  
  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-3 h-3 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-3 h-3 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    );
  }
  
  return <ChatInterface />;
} 