import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

interface EmailValidationResponse {
  isValid: boolean;
}

/**
 * Check if an email is allowed by making an API call to validate it
 */
async function isEmailAllowed(email: string): Promise<boolean> {
  if (!email) return false;
  
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/validate-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email.toLowerCase() }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as EmailValidationResponse;
    return data.isValid || false;
  } catch (error) {
    console.error('Error validating email:', error);
    return false;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/access-denied",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only apply email restrictions for Google OAuth
      if (account?.provider === "google") {
        const email = user.email ?? profile?.email;
        
        if (!email || !(await isEmailAllowed(email))) {
          // Redirect to access denied page
          return "/auth/access-denied";
        }
        
        // After successful email validation, mint JWT tokens and set cookies
        try {
          console.log('🔑 Creating JWT tokens for user:', email);
          const { createTokens } = await import('@/lib/jwt');
          const { cookies } = await import('next/headers');
          
          // Create JWT tokens
          const tokens = createTokens(email.toLowerCase());
          
          // Set JWT tokens as HttpOnly cookies
          const cookieStore = await cookies();
          
          cookieStore.set('access_token', tokens.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 15 * 60 // 15 minutes
          });
          
          cookieStore.set('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60 // 30 days
          });
          
          console.log('✅ JWT tokens created and cookies set for:', email);
        } catch (error) {
          console.error('Error creating JWT tokens:', error);
          return "/auth/access-denied";
        }
      }
      
      return true;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
      },
    }),
  },
} satisfies NextAuthConfig;
