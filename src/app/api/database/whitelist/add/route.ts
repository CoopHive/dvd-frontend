import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth-utils';
import { SERVER_CONFIG } from '@/config/server-config';

/**
 * POST /api/database/whitelist/add
 * Protected proxy to database server whitelist addition
 */
export const POST = withAuthHandler(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    
    const response = await fetch(`${SERVER_CONFIG.database.url}${SERVER_CONFIG.database.endpoints.whitelistAdd}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Database server whitelist-add error:', error);
    return NextResponse.json(
      { error: 'Failed to add to whitelist' },
      { status: 500 }
    );
  }
});