import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth-utils';
import { SERVER_CONFIG } from '@/config/server-config';

/**
 * GET /api/database/whitelist/get
 * Protected proxy to database server whitelist retrieval
 */
export const GET = withAuthHandler(async (user, request: NextRequest) => {
  try {
    // Call the backend endpoint with user's email as path parameter
    const response = await fetch(`${SERVER_CONFIG.database.url}/api/whitelist/${encodeURIComponent(user.email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Database server whitelist-get error:', error);
    return NextResponse.json(
      { error: 'Failed to get whitelist' },
      { status: 500 }
    );
  }
});