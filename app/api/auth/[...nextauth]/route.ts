import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createSafeAdapter } from '../../../../lib/auth-adapter'
import type { User, Account, Profile, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { getMockUserById, getAllMockUsers, isDevelopmentEnvironment } from '../../../../lib/mock-users'
import { shouldUseMockAuth, getEnvironmentMode, getBaseUrl } from '../../../../lib/environment'
import { createUserDataService } from '../../../../lib/user-scoped-data'

// Force dynamic rendering - critical for environment-specific auth behavior
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Conditional logging utility
const isDev = getEnvironmentMode() === 'development'
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
    if (getEnvironmentMode() === 'production') {
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
    // Production OAuth flow - always redirect to main app (no forced onboarding redirect)
    // Let the main app handle onboarding detection after successful authentication
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
    
    // Auto-enable calendar integration for Google OAuth users
    if (user?.id && getEnvironmentMode() === 'production') {
      try {
        const dataService = createUserDataService(user.id)
        
        // Check if calendar integration already exists
        const existingIntegrations = await dataService.getIntegrations()
        const hasCalendarIntegration = existingIntegrations.some((i: any) => i.type === 'google_calendar')
        
        if (!hasCalendarIntegration) {
          // Auto-create calendar integration
          await dataService.createIntegration({
            type: 'google_calendar',
            accessToken: typeof account.access_token === 'string' ? account.access_token : '',
            refreshToken: typeof account.refresh_token === 'string' ? account.refresh_token : null,
            expiresAt: typeof account.expires_at === 'number' ? new Date(account.expires_at * 1000) : null,
            metadata: { 
              status: 'auto-enabled',
              grantedScopes: ['calendar.readonly', 'meetings.space.readonly', 'drive.readonly'],
              autoEnabledAt: new Date().toISOString()
            },
            isActive: true
          })
          authLog('Auto-enabled calendar integration for Google OAuth user')
        }
        
        await dataService.disconnect()
      } catch (error) {
        authError('Failed to auto-enable calendar integration:', error)
        // Don't fail auth if integration creation fails
      }
    }
  }
  
  if (user && 'id' in user) {
    token.sub = user.id
  }
  return token
}

// Include both providers - routing will be handled by custom signin page
const providers = [
  // Mock credentials provider for development and staging
  CredentialsProvider({
    id: 'mock-auth',
    name: 'Mock User',
    credentials: {
      userId: { 
        label: 'User ID', 
        type: 'text',
        placeholder: 'Enter user ID' 
      }
    },
    async authorize(credentials, req) {
      authLog('Mock auth AUTHORIZE function called');
      authLog('Credentials received:', credentials);
      authLog('Environment check - NODE_ENV:', getEnvironmentMode());
      
      if (!credentials?.userId) {
        authLog('❌ No userId provided in credentials');
        return null
      }
      
      // CRITICAL FIX: Preserve the original user ID passed from client
      // The client already sends the correct environment-prefixed ID (staging_1, etc.)
      const requestedUserId = credentials.userId
      authLog('🔍 Requested user ID from client:', requestedUserId);
      
      const user = getMockUserById(requestedUserId)
      if (!user) {
        authLog('❌ User not found for ID:', requestedUserId);
        authLog('Available mock users:', getAllMockUsers().map(u => u.id));
        return null
      }
      
      authLog('✅ Mock user found, authenticating:', user.name);
      authLog('✅ Returning user with ID:', user.id);
      
      // CRITICAL: Return the user ID exactly as provided by the client
      // This preserves staging_ prefixes and other environment-specific IDs
      return {
        id: user.id, // This should be staging_1, staging_2, etc. in staging
        name: user.name,
        email: user.email,
        image: user.image
      }
    },
  }),
  // Google OAuth provider for production
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
authLog('Environment mode:', getEnvironmentMode());
authLog('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
authLog('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set');

const safeAdapter = createSafeAdapter()

// Log adapter and session strategy for debugging
authLog('Database adapter available:', !!safeAdapter)
authLog('Session strategy:', (getEnvironmentMode() === 'development' || !safeAdapter) ? 'jwt' : 'database')

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
    // Use JWT sessions for simplicity with dynamic auth providers
    strategy: 'jwt',
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
  pages: {
    signIn: '/auth/signin', // Dynamic sign-in page that routes based on environment
    signOut: '/', // Explicitly set signout page to home
  },
})

export { handler as GET, handler as POST }