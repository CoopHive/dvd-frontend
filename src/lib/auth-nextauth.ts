import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

/**
 * Get the current authenticated user from NextAuth session
 * This replaces the custom JWT getCurrentUser function
 */
export async function getCurrentUser(): Promise<{ email: string } | null> {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      console.log('❌ NextAuth Debug - No session or email found');
      return null;
    }
    
    console.log('✅ NextAuth Debug - User authenticated:', session.user.email);
    return { email: session.user.email };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication for server components
 * Redirects to sign-in page if not authenticated
 */
export async function requireAuth(): Promise<{ email: string }> {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/signin');
  }
  
  return user;
}

/**
 * Check if user is authenticated without redirecting
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Get user email from session
 * Returns null if not authenticated
 */
export async function getUserEmail(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.email ?? null;
}