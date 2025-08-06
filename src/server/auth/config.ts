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
  // Use JWT strategy for session management
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // JWT configuration
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
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
        
        console.log('✅ Email validation successful for:', email);
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user && account) {
        token.email = user.email?.toLowerCase();
        token.provider = account.provider;
        console.log('🔑 JWT token created for user:', token.email);
      }
      
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.sub!;
        session.user.email = token.email!;
      }
      
      return session;
    },
  },
} satisfies NextAuthConfig;
