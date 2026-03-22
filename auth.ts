import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from '@/lib/db'
import { authConfig } from './auth.config'

const linuxDOProvider = {
  id: 'linuxdo',
  name: 'LinuxDO',
  type: 'oauth' as const,
  issuer: 'https://connect.linux.do',
  authorization: { params: { scope: 'openid' } },
  token: 'https://connect.linux.do/oauth/token',
  userinfo: 'https://connect.linux.do/api/user',
  clientId: process.env.LINUXDO_CLIENT_ID!,
  clientSecret: process.env.LINUXDO_CLIENT_SECRET!,
  profile(profile: any) {
    return {
      id: profile.sub,
      name: profile.username,
      email: profile.email,
      image: profile.avatar_url,
    }
  },
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: 'jwt',
    maxAge: 60 * 120, // 2 hours
  },
  providers: [
    ...authConfig.providers,
    linuxDOProvider,
  ],
  callbacks: {
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.sub!
      }
      return session
    },
    async jwt({ token, user }: any) {
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
  },
})
