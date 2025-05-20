"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { useChat } from "~/hooks/use-chat";
import ChatInterface from "~/components/chat-interface";
import { useEffect } from "react";

// Loading component to avoid duplication
function LoadingSpinner() {
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

export default function ChatIndexPage() {
  const { status } = useSession();
  
  // Handle authentication status first to avoid hook rule violations
  if (status === "unauthenticated") {
    redirect("/auth/signin");
  }
  
  if (status === "loading") {
    return <LoadingSpinner />;
  }
  
  // We only reach this point if authenticated
  return <AuthenticatedContent />;
}

// Separate component for authenticated users to ensure hooks run unconditionally
function AuthenticatedContent() {
  const { chats, startNewChat } = useChat();
  
  // Now we can use hooks safely
  useEffect(() => {
    if (chats.length > 0 && chats[0]?.id) {
      redirect(`/chat/${chats[0].id}`);
    } else {
      // If no chats, create one
      startNewChat();
    }
  }, [chats, startNewChat]);
  
  return <ChatInterface />;
} 