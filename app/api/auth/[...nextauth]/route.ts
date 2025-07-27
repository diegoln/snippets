import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Mock users for development
const mockUsers = [
  {
    id: '1',
    name: 'John Developer',
    email: 'john@example.com',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: '2', 
    name: 'Sarah Engineer',
    email: 'sarah@example.com',
    image: 'https://images.unsplash.com/photo-1494790108755-2616b9f2d30c?w=100&h=100&fit=crop&crop=face'
  },
  {
    id: '3',
    name: 'Alex Designer',
    email: 'alex@example.com', 
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
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
  debug: process.env.NODE_ENV === 'production', // Only debug in production for now
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log('[NextAuth] signIn callback triggered:', {
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
        console.error('[NextAuth] signIn callback error:', error);
        return false
      }
    },
    async redirect({ url, baseUrl }) {
      console.log('[NextAuth] redirect callback:', { url, baseUrl });
      
      // Custom redirect logic for onboarding flow
      if (process.env.NODE_ENV === 'production') {
        // In production, new users should go to onboarding
        // Returning users should go to dashboard
        // For now, always redirect to onboarding - we'll add user check later
        return `${baseUrl}/onboarding`
      }
      
      // Development uses our custom flow
      return url.startsWith(baseUrl) ? url : baseUrl
    },
    session: async ({ session, token, user }) => {
      console.log('[NextAuth] session callback:', {
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
    },
    jwt: async ({ token, user, account, profile }) => {
      console.log('[NextAuth] jwt callback:', {
        hasToken: !!token,
        hasUser: !!user,
        hasAccount: !!account,
        provider: account?.provider,
      });
      
      if (user && 'id' in user) {
        token.sub = user.id
      }
      return token
    },
  },
  session: {
    strategy: process.env.NODE_ENV === 'development' ? 'jwt' : 'database',
  },
  events: {
    async signIn(message) {
      console.log('[NextAuth] Event - signIn:', message);
    },
    async signOut(message) {
      console.log('[NextAuth] Event - signOut:', message);
    },
    async createUser(message) {
      console.log('[NextAuth] Event - createUser:', message);
    },
    async linkAccount(message) {
      console.log('[NextAuth] Event - linkAccount:', message);
    },
    async session(message) {
      console.log('[NextAuth] Event - session:', message);
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