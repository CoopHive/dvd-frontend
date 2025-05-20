"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { useChat } from "~/hooks/use-chat";
import ChatInterface from "~/components/chat-interface";
import { useEffect } from "react";

export default function ChatIndexPage() {
  const { data: session, status } = useSession();
  const { chats, startNewChat } = useChat();
  
  // If the user is not authenticated, redirect to signin page
  if (status === "unauthenticated") {
    redirect("/auth/signin");
  }
  
  // If loading, show loading state
  if (status === "loading") {
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
  
  // If there are chats, redirect to the first one
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