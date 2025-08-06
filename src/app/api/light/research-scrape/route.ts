import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withAuthHandler } from '@/lib/auth-utils';
import { SERVER_CONFIG } from '@/config/server-config';

/**
 * POST /api/light/research-scrape
 * Protected proxy to light server research scraping
 */
export const POST = withAuthHandler(async (user, request: NextRequest) => {
  try {
    const body = await request.json() as Record<string, unknown>;
    
    const response = await fetch(`${SERVER_CONFIG.light.url}${SERVER_CONFIG.light.endpoints.researchScrape}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    // Check if response is a file (zip) or JSON
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/zip')) {
      // Handle zip file response
      const buffer = await response.arrayBuffer();
      
      // Create NextResponse with the file data
      const fileResponse = new NextResponse(buffer, {
        status: response.status,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': response.headers.get('Content-Disposition') ?? 'attachment; filename="research_papers.zip"',
          'X-Papers-Count': response.headers.get('X-Papers-Count') ?? '',
        },
      });
      
      return fileResponse;
    } else {
      // Handle JSON response (errors, etc.)
      const data = await response.json() as unknown;
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    console.error('Light server research-scrape error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape research data' },
      { status: 500 }
    );
  }
});