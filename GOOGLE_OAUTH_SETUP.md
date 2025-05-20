# Setting Up Google OAuth for Chat Application

Follow these steps to set up Google OAuth for the chat application:

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click on "Select a project" at the top, then click "New Project"
3. Enter a name for your project, then click "Create"
4. Select your new project once it's created

## 2. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" for User Type (unless you have a Google Workspace organization)
3. Click "Create"
4. Fill in the app information:
   - App name: "Chat App" (or your preferred name)
   - User support email: Your email address
   - Developer contact information: Your email address
5. Click "Save and Continue"
6. Skip adding scopes (we only need basic profile/email access)
7. Click "Save and Continue"
8. Add test users if you're in testing mode
9. Click "Save and Continue" to finish the consent screen setup

## 3. Create OAuth Client ID

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: "Web application"
4. Name: "Chat Web Client" (or your preferred name)
5. Authorized JavaScript origins: Add `http://localhost:3000` (for development)
6. Authorized redirect URIs: Add `http://localhost:3000/api/auth/callback/google`
7. Click "Create"
8. Note your Client ID and Client Secret (you'll need these for your .env file)

## 4. Set Up Environment Variables

Create a `.env.local` file in the root of your project with:

```
# Next Auth
NEXTAUTH_SECRET="your-generated-secret-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id-from-google-cloud"
GOOGLE_CLIENT_SECRET="your-client-secret-from-google-cloud"
```

## 5. Run Your Application

Start the development server with:

```
bun run dev
```

Now you should be able to sign in with Google and have user-specific chat storage. 