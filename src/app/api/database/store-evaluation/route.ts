import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { BACKEND_API_CONFIG } from "~/config/backend-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const url = `${BACKEND_API_CONFIG.database.url}${BACKEND_API_CONFIG.database.endpoints.storeEvaluation}`;
    
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
    console.error("Database server store evaluation proxy error:", error);
    return NextResponse.json(
      { error: "Failed to connect to database server" },
      { status: 500 }
    );
  }
}