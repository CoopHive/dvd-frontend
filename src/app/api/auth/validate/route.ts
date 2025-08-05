import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/jwt';

/**
 * GET /api/auth/validate
 * Verify access token and return user email
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ email: user.email });
  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}