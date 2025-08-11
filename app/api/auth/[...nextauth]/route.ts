import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createSafeAdapter } from '../../../../lib/auth-adapter'
import type { User, Account, Profile, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { getMockUserById, getAllMockUsers, isDevelopmentEnvironment } from '../../../../lib/mock-users'
import { shouldUseMockAuth, getEnvironmentMode, getBaseUrl } from '../../../../lib/environment'


// Conditional logging utility
const isDev = process.env.NODE_ENV === 'development'
const isDebugEnabled = process.env.NEXTAUTH_DEBUG === 'true'

const authLog = (message: string, data?: any) => {
  if (isDev || isDebugEnabled) {
    console.log(`[NextAuth] ${message}`, data || '')
  }
}

const authError = (message: string, error?: any) => {
  console.error(`[NextAuth] ${message}`, error || '')
}

// Callback utility functions
const handleSignIn = async (params: any) => {
  const { user, account, profile } = params;
  try {
    authLog('signIn callback triggered:', {
      user: user?.email,
      provider: account?.provider,
      accountId: account?.providerAccountId,
    });
    
    // In production, always allow Google OAuth sign-in
    if (process.env.NODE_ENV === 'production') {
      return true
    }
    
    // Development logic (existing)
    return true
  } catch (error) {
    authError('signIn callback error:', error);
    return false
  }
}

const handleRedirect = async ({ url, baseUrl }: { url: string; baseUrl: string }) => {
  authLog('redirect callback:', { url, baseUrl });
  
  // Get environment-appropriate base URL
  const correctBaseUrl = getBaseUrl();
  
  // Handle signout redirects - always redirect to the appropriate home page
  if (url === `${correctBaseUrl}/api/auth/signout` || url.includes('signout')) {
    authLog('Signout redirect detected, redirecting to home page');
    return correctBaseUrl;
  }
  
  const envMode = getEnvironmentMode();
  
  // Custom redirect logic based on environment
  if (envMode === 'production') {
    // Production OAuth flow - redirect to production app
    if (url.startsWith(correctBaseUrl) && url !== correctBaseUrl) {
      return url
    }
    return correctBaseUrl
  } else if (envMode === 'staging') {
    // Staging flow - redirect to staging area
    if (url.startsWith(correctBaseUrl) && url !== correctBaseUrl) {
      return url
    }
    return correctBaseUrl
  } else {
    // Development flow - use existing logic
    return url.startsWith(baseUrl) ? url : baseUrl
  }
}

const handleSession = async (params: any) => {
  const { session, token, user } = params;
  authLog('session callback:', {
    hasSession: !!session,
    hasToken: !!token,
    hasUser: !!user,
    tokenSub: token?.sub,
  });
  
  if (session?.user) {
    if (user && 'id' in user) {
      (session.user as any).id = user.id
    } else if (token?.sub) {
      (session.user as any).id = token.sub
    }
  }
  return session
}

const handleJWT = async (params: any) => {
  const { token, user, account, profile } = params;
  authLog('jwt callback:', {
    hasToken: !!token,
    hasUser: !!user,
    hasAccount: !!account,
    provider: account?.provider,
  });
  
  // Store Google OAuth tokens for batch processing
  if (account?.provider === 'google') {
    token.accessToken = account.access_token
    token.refreshToken = account.refresh_token
    token.expiresAt = account.expires_at
    authLog('Stored Google OAuth tokens with extended scopes')
  }
  
  if (user && 'id' in user) {
    token.sub = user.id
  }
  return token
}

// Use mock credentials provider in dev-like environments, real Google OAuth in production  
const providers = shouldUseMockAuth()
  ? [
      CredentialsProvider({
        name: 'credentials',
        credentials: {
          userId: { 
            label: 'User ID', 
            type: 'text',
            placeholder: 'Enter user ID' 
          }
        },
        async authorize(credentials, req) {
          authLog('AUTHORIZE FUNCTION CALLED!');
          authLog('Credentials received:', credentials);
          authLog('Request object:', req ? 'Present' : 'Missing');
          
          if (!credentials?.userId) {
            authLog('❌ No userId provided in credentials');
            return null
          }
          
          const user = getMockUserById(credentials.userId)
          if (!user) {
            authLog('❌ User not found for ID:', credentials.userId);
            return null
          }
          
          authLog('✅ User found, authenticating:', user.name);
          
          // Return user object for JWT
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image
          }
        },
      })
    ]
  : [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            scope: [
              "openid",
              "email", 
              "profile",
              // Calendar API - for event metadata
              "https://www.googleapis.com/auth/calendar.readonly",
              // Meet API - for transcripts and recordings
              "https://www.googleapis.com/auth/meetings.space.readonly",
              // Drive API - for accessing meeting artifacts stored in Drive
              "https://www.googleapis.com/auth/drive.readonly",
              // Docs API - for accessing meeting notes and AI-generated summaries
              "https://www.googleapis.com/auth/documents.readonly"
            ].join(" "),
            // Request offline access for refresh tokens (batch processing)
            access_type: "offline",
            // Force consent screen to ensure we get refresh token
            prompt: "consent"
          }
        }
      })
    ]

// Debug environment variables
authLog('NextAuth Environment Check:');
authLog('NODE_ENV:', process.env.NODE_ENV);
authLog('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
authLog('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set');

const safeAdapter = createSafeAdapter()

// Log adapter and session strategy for debugging
authLog('Database adapter available:', !!safeAdapter)
authLog('Session strategy:', (process.env.NODE_ENV === 'development' || !safeAdapter) ? 'jwt' : 'database')

const handler = NextAuth({
  // Use safe adapter that handles database connection failures gracefully
  adapter: safeAdapter,
  providers,
  debug: isDebugEnabled, // Only enable when explicitly requested
  callbacks: {
    signIn: handleSignIn,
    redirect: handleRedirect,
    session: handleSession,
    jwt: handleJWT,
  },
  session: {
    // Use JWT sessions in dev-like environments or if no adapter available
    strategy: (shouldUseMockAuth() || !safeAdapter) ? 'jwt' : 'database',
  },
  events: {
    async signIn(message) {
      authLog('Event - signIn:', message);
    },
    async signOut(message) {
      authLog('Event - signOut:', message);
    },
    async createUser(message) {
      authLog('Event - createUser:', message);
    },
    async linkAccount(message) {
      authLog('Event - linkAccount:', message);
    },
    async session(message) {
      authLog('Event - session:', message);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: shouldUseMockAuth() ? {
    signIn: '/mock-signin',
    newUser: '/onboarding-wizard',
  } : {
    newUser: '/onboarding-wizard',
    signOut: '/', // Explicitly set signout page to home
  },
})

export { handler as GET, handler as POST }