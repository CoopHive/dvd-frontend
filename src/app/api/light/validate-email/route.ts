import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SERVER_CONFIG } from "@/config/server-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const url = `${SERVER_CONFIG.light.url}${SERVER_CONFIG.light.endpoints.validateEmail}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as unknown;
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Light server validate email proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to light server" },
      { status: 500 }
    );
  }
}