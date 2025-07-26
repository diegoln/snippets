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
        name: 'credentials',
        credentials: {
          userId: { 
            label: 'User ID', 
            type: 'text',
            placeholder: 'Enter user ID' 
          }
        },
        async authorize(credentials, req) {
          console.log('🔐 AUTHORIZE FUNCTION CALLED!')
          console.log('   Credentials received:', credentials)
          console.log('   Request object:', req ? 'Present' : 'Missing')
          
          if (!credentials?.userId) {
            console.log('❌ No userId provided in credentials')
            return null
          }
          
          const user = mockUsers.find(u => u.id === credentials.userId)
          if (!user) {
            console.log('❌ User not found for ID:', credentials.userId)
            return null
          }
          
          console.log('✅ User found, authenticating:', user.name)
          
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
              "https://www.googleapis.com/auth/calendar.readonly"
            ].join(" ")
          }
        }
      })
    ]

// Debug environment variables
console.log('🔧 NextAuth Environment Check:')
console.log('   NODE_ENV:', process.env.NODE_ENV)
console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('   NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : 'Not set')

export const authOptions = {
  debug: true, // Enable NextAuth debug logging
  adapter: process.env.NODE_ENV === 'development' ? undefined : PrismaAdapter(prisma),
  providers,
  session: {
    strategy: 'jwt', // REQUIRED for credentials provider
  },
  callbacks: {
    async jwt({ token, user, account }) {
      console.log('🔧 JWT Callback - token:', token, 'user:', user, 'account:', account)
      
      // When user signs in with credentials, add user info to JWT token
      if (user) {
        token.sub = user.id
        token.name = user.name
        token.email = user.email
        token.picture = user.image
        console.log('✅ JWT token updated with user data')
      }
      
      // Store Google OAuth tokens securely in database, not JWT
      if (account && account.provider === 'google' && account.access_token) {
        // Store tokens in database via Account model (handled by NextAuth adapter)
        // Don't store in JWT for security reasons
        console.log('✅ Google tokens will be stored securely via adapter')
      }
      
      return token
    },
    async session({ session, token }) {
      console.log('🔧 Session Callback - session:', session, 'token:', token)
      
      // Get user info from JWT token for session
      if (token) {
        session.user = {
          id: token.sub,
          name: token.name,
          email: token.email,
          image: token.picture
        }
        console.log('✅ Session updated with token data')
      }
      return session
    },
    async signIn({ user, account, profile }) {
      console.log('🔧 SignIn Callback - user:', user, 'account:', account)
      // Always allow sign in for development and production
      return true
    },
    async redirect({ url, baseUrl }) {
      console.log('🔧 Redirect Callback - url:', url, 'baseUrl:', baseUrl)
      
      // Custom redirect logic for onboarding flow
      if (process.env.NODE_ENV === 'production') {
        // In production, new users should go to onboarding
        return `${baseUrl}/onboarding`
      }
      
      // Development uses our custom flow
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret',
  pages: {
    signIn: '/mock-signin',
    newUser: '/onboarding',
  },
}

const handler = NextAuth(authOptions)

// Wrap the handler to log incoming requests
async function loggedHandler(req: Request, context: any) {
  const method = req.method
  const url = req.url
  
  console.log(`\n🌐 NEXTAUTH REQUEST: ${method} ${url}`)
  
  if (method === 'POST') {
    try {
      // Clone the request to read the body without consuming it
      const clonedReq = req.clone()
      const body = await clonedReq.text()
      console.log(`📦 Request Body: ${body}`)
      console.log(`📋 Content-Type: ${req.headers.get('content-type')}`)
      
      // Parse form data if it's form-encoded
      if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(body)
        console.log(`🔍 Parsed Parameters:`)
        for (const [key, value] of params.entries()) {
          console.log(`   ${key}: ${value}`)
        }
      }
    } catch (error) {
      console.log(`❌ Could not read request body: ${error.message}`)
    }
  }
  
  console.log(`🔚 End request log\n`)
  
  // Call the original handler
  return handler(req, context)
}

export { loggedHandler as GET, loggedHandler as POST }