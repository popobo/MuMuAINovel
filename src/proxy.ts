import { authConfig } from '@/auth.config'
import NextAuth from 'next-auth'
import type { NextRequest } from 'next/server'

export const { auth: proxy } = NextAuth(authConfig)

export default proxy((req: NextRequest) => {
  // Add custom logic here if needed
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/wizard/:path*',
    '/api/projects/:path*',
    '/api/chapters/:path*',
    '/api/characters/:path*',
  ],
}
