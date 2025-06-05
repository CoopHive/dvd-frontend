"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { ShieldX, ArrowLeft } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="w-full max-w-md p-8 space-y-8 bg-[#171717] rounded-lg shadow-lg text-center">
        <div className="space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="p-4 bg-red-500/10 rounded-full">
              <ShieldX className="w-12 h-12 text-red-500" />
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          
          {/* Description */}
          <div className="space-y-2">
            <p className="text-zinc-400">
              You do not have permission to access this application.
            </p>
            <p className="text-sm text-zinc-500">
              Please contact your administrator if you believe this is an error, or try signing in with an authorized account.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/auth/signin">
            <Button className="w-full py-6 bg-white hover:bg-gray-200 text-black flex items-center justify-center gap-3">
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Button>
          </Link>
          
          <p className="text-xs text-zinc-600">
            Only authorized users can access this application
          </p>
        </div>
      </div>
    </div>
  );
} 