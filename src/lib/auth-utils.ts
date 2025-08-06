import { getCurrentUser } from '@/lib/auth-nextauth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Server-side route protection utility
 * Returns the current user or throws a 401 response
 */
export async function requireAuth(): Promise<{ email: string }> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Middleware helper to protect API routes
 * Usage: const user = await withAuth(request);
 */
export async function withAuth(_request: NextRequest): Promise<{ email: string }> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withAuthHandler<T extends unknown[]>(
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