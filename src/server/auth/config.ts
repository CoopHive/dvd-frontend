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

// Email whitelist configuration
const ALLOWED_EMAIL_DOMAINS = [
  "yourdomain.com",
  "company.com",
];

const ALLOWED_EMAILS = [
  "vardhanshorewala@gmail.com",
  "vardhanshorewala@berkeley.edu",
];

/**
 * Check if an email is allowed based on domain or specific email whitelist
 */
function isEmailAllowed(email: string): boolean {
  if (!email) return false;
  
  // Check if the specific email is in the allowed list
  if (ALLOWED_EMAILS.includes(email.toLowerCase())) {
    return true;
  }
  
  // Check if the email domain is in the allowed domains list
  const domain = email.split("@")[1];
  if (domain && ALLOWED_EMAIL_DOMAINS.includes(domain.toLowerCase())) {
    return true;
  }
  
  return false;
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
        const email = user.email || profile?.email;
        
        if (!email || !isEmailAllowed(email)) {
          // Redirect to access denied page
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
