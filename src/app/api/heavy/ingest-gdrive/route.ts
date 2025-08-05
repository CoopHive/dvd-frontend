import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth-utils';
import { SERVER_CONFIG } from '@/config/server-config';

/**
 * POST /api/heavy/ingest-gdrive
 * Protected proxy to heavy server Google Drive ingestion
 */
export const POST = withAuthHandler(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    
    const response = await fetch(`${SERVER_CONFIG.heavy.url}${SERVER_CONFIG.heavy.endpoints.ingest}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Heavy server ingest-gdrive error:', error);
    return NextResponse.json(
      { error: 'Failed to ingest Google Drive data' },
      { status: 500 }
    );
  }
});