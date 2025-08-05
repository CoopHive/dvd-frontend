import { NextRequest, NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth-utils';
import { SERVER_CONFIG } from '@/config/server-config';

/**
 * POST /api/light/research-scrape
 * Protected proxy to light server research scraping
 */
export const POST = withAuthHandler(async (user, request: NextRequest) => {
  try {
    const body = await request.json();
    
    const response = await fetch(`${SERVER_CONFIG.light.url}${SERVER_CONFIG.light.endpoints.researchScrape}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Light server research-scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape research data' },
      { status: 500 }
    );
  }
});