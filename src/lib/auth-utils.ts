import { getCurrentUser } from '@/lib/jwt';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side route protection utility
 * Returns the current user or throws a 401 response
 */
export async function requireAuth(): Promise<{ email: string }> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Response('Unauthorized', { status: 401 });
  }
  
  return user;
}

/**
 * Middleware helper to protect API routes
 * Usage: const user = await withAuth(request);
 */
export async function withAuth(request: NextRequest): Promise<{ email: string }> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return user;
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withAuthHandler<T extends any[]>(
  handler: (user: { email: string }, ...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      console.log('🔐 Auth Handler - Starting authentication check');
      const user = await getCurrentUser();
      
      if (!user) {
        console.log('🚫 Auth Handler - Authentication FAILED - returning 401');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      console.log('✅ Auth Handler - Authentication SUCCESS - proceeding with request for user:', user.email);
      return await handler(user, ...args);
    } catch (error) {
      console.error('❌ Auth Handler - Error during authentication:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}