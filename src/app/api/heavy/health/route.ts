import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth-utils';
import { SERVER_CONFIG } from '@/config/server-config';

/**
 * GET /api/heavy/health
 * Protected proxy to heavy server health check
 */
export const GET = withAuthHandler(async (user, request: NextRequest) => {
  try {
    const response = await fetch(`${SERVER_CONFIG.heavy.url}${SERVER_CONFIG.heavy.endpoints.health}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Heavy server health error:', error);
    return NextResponse.json(
      { error: 'Failed to get server health' },
      { status: 500 }
    );
  }
});