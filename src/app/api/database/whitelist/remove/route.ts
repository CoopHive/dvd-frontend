import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth-utils';
import { SERVER_CONFIG } from '@/config/server-config';

/**
 * POST /api/database/whitelist/remove
 * Protected proxy to database server whitelist removal
 */
export const POST = withAuthHandler(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    
    const response = await fetch(`${SERVER_CONFIG.database.url}${SERVER_CONFIG.database.endpoints.whitelistRemove}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Database server whitelist-remove error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from whitelist' },
      { status: 500 }
    );
  }
});