"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNextAuth } from "~/hooks/use-nextauth";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useNextAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push("/chat");
      } else {
        router.push("/auth/signin");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }}></div>
          <div className="w-3 h-3 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }}></div>
          <div className="w-3 h-3 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }}></div>
        </div>
      </div>
    );
  }

  return null; // This should not render as useEffect will redirect
} 