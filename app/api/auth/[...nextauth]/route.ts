import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import type { User, Account, Profile, Session } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

// Singleton pattern for PrismaClient to prevent multiple connections in serverless
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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
  
  // Custom redirect logic for onboarding flow
  if (process.env.NODE_ENV === 'production') {
    // If user is being redirected to a specific URL and it's within our domain, allow it
    if (url.startsWith(baseUrl) && url !== baseUrl) {
      return url
    }
    
    // Default redirect for new OAuth sign-ins in production
    // TODO: Check if user has completed onboarding to differentiate new vs returning users
    return `${baseUrl}/onboarding`
  }
  
  // Development uses our custom flow
  return url.startsWith(baseUrl) ? url : baseUrl
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
  
  if (user && 'id' in user) {
    token.sub = user.id
  }
  return token
}

// Mock users for development
const mockUsers = [
  {
    id: '1',
    name: 'John Developer',
    email: 'john@example.com',
    image: '/avatars/avatar-1.png'
  },
  {
    id: '2', 
    name: 'Sarah Engineer',
    email: 'sarah@example.com',
    image: '/avatars/avatar-2.png'
  },
  {
    id: '3',
    name: 'Alex Designer',
    email: 'alex@example.com', 
    image: '/avatars/avatar-3.png'
  }
]

// Use mock credentials provider in development, real Google OAuth in production
const providers = process.env.NODE_ENV === 'development' 
  ? [
      CredentialsProvider({
        id: 'mock-google',
        name: 'Google (Dev)',
        credentials: {
          userId: { label: 'User', type: 'text' }
        },
        async authorize(credentials) {
          try {
            if (!credentials?.userId) return null
            
            const user = mockUsers.find(u => u.id === credentials.userId)
            if (!user) return null
            
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image
            }
          } catch (error) {
            console.error('Auth error:', error)
            return null
          }
        },
      })
    ]
  : [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    ]

const handler = NextAuth({
  adapter: process.env.NODE_ENV === 'development' ? undefined : PrismaAdapter(prisma),
  providers,
  debug: isDebugEnabled, // Only enable when explicitly requested
  callbacks: {
    signIn: handleSignIn,
    redirect: handleRedirect,
    session: handleSession,
    jwt: handleJWT,
  },
  session: {
    strategy: process.env.NODE_ENV === 'development' ? 'jwt' : 'database',
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
  pages: process.env.NODE_ENV === 'development' ? {
    signIn: '/mock-signin',
    newUser: '/onboarding',
  } : {
    newUser: '/onboarding',
  },
})

export { handler as GET, handler as POST }