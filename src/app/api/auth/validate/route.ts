import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-nextauth';

/**
 * GET /api/auth/validate
 * Verify NextAuth session and return user email
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ email: user.email });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired session' },
      { status: 401 }
    );
  }
}