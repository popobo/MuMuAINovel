import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        // Local auth check
        if (process.env.LOCAL_AUTH_ENABLED === 'true') {
          const localUsername = process.env.LOCAL_AUTH_USERNAME
          const localPassword = process.env.LOCAL_AUTH_PASSWORD

          if (credentials.username === localUsername &&
              credentials.password === localPassword) {
            // Find or create user
            let user = await db.user.findUnique({
              where: { username: localUsername },
            })

            if (!user) {
              user = await db.user.create({
                data: {
                  username: localUsername,
                  displayName: process.env.LOCAL_AUTH_DISPLAY_NAME || localUsername,
                },
              })
            }

            return {
              id: user.id,
              name: user.displayName,
              email: user.email,
            }
          }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
      }
      return session
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 60 * 120, // 2 hours
  },
}
