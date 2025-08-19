import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SERVER_CONFIG } from "@/config/server-config";

export async function GET(request: NextRequest, { params }: { params: Promise<{ user_email: string }> }) {
  try {
    const { user_email } = await params;
    
    if (!user_email) {
      return NextResponse.json(
        { error: "user_email parameter is required" },
        { status: 400 }
      );
    }

    const url = `${SERVER_CONFIG.database.url}/api/whitelist/${encodeURIComponent(user_email)}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json() as unknown;
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Database server whitelist get proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to database server" },
      { status: 500 }
    );
  }
}