"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function Home() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/chat");
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Loading state
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