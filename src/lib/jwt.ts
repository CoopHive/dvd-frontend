import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { env } from '~/env.js';

export interface JWTPayload {
  email: string;
}

export interface JWTTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Sign an access token with 15 minute expiration
 */
export function signAccess(email: string): string {
  return jwt.sign(
    { email },
    env.JWT_SECRET,
    { 
      algorithm: 'HS256',
      expiresIn: '15m'
    }
  );
}

/**
 * Sign a refresh token with 30 day expiration
 */
export function signRefresh(email: string): string {
  return jwt.sign(
    { email },
    env.JWT_REFRESH_SECRET,
    { 
      algorithm: 'HS256',
      expiresIn: '30d'
    }
  );
}

/**
 * Verify an access token
 */
export function verifyAccess(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefresh(token: string): JWTPayload | null {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ['HS256'] }) as JWTPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Get current user from cookies by verifying access token
 */
export async function getCurrentUser(): Promise<{ email: string } | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;
  
  
  if (!accessToken) {
    console.log('❌ JWT Debug - No access token found');
    return null;
  }
  
  const payload = verifyAccess(accessToken);
  console.log('🔍 JWT Debug - Token verification result:', !!payload);
  return payload ? { email: payload.email } : null;
}

/**
 * Set JWT tokens as HttpOnly cookies (async version)
 */
export async function setTokenCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();
  
  // Set access token cookie (15 minutes)
  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60 // 15 minutes in seconds
  });
  
  // Set refresh token cookie (30 days)
  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 // 30 days in seconds
  });
}

/**
 * Clear JWT token cookies (async version)
 */
export async function clearTokenCookies() {
  const cookieStore = await cookies();
  
  cookieStore.set('access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
  
  cookieStore.set('refresh_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

/**
 * Create both access and refresh tokens for a given email
 */
export function createTokens(email: string): JWTTokens {
  return {
    accessToken: signAccess(email),
    refreshToken: signRefresh(email)
  };
}