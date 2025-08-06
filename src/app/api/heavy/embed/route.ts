import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth-utils';
import { SERVER_CONFIG } from '@/config/server-config';

/**
 * POST /api/heavy/embed
 * Protected proxy to heavy server embedding generation
 */
export const POST = withAuthHandler(async (_user, request: NextRequest) => {
  try {
    const body = await request.json() as unknown;
    
    const response = await fetch(`${SERVER_CONFIG.heavy.url}${SERVER_CONFIG.heavy.endpoints.embed}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json() as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Heavy server embed error:', error);
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    );
  }
});