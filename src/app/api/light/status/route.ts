import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth-utils';
import { SERVER_CONFIG } from '@/config/server-config';

/**
 * GET /api/light/status
 * Protected proxy to light server status check
 * Expects user_email as query parameter
 */
export const GET = withAuthHandler(async (user, request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('user_email');
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'user_email parameter is required' },
        { status: 400 }
      );
    }
    
    // Forward the request to the light server with the user_email parameter
    const url = new URL(`${SERVER_CONFIG.light.url}${SERVER_CONFIG.light.endpoints.status}`);
    url.searchParams.append('user_email', userEmail);
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json() as unknown;
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Light server status error:', error);
    return NextResponse.json(
      { error: 'Failed to get server status' },
      { status: 500 }
    );
  }
});