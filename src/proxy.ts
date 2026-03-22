import { authConfig } from '@/auth.config'
import NextAuth from 'next-auth'

export const { auth: proxy } = NextAuth(authConfig)

export default proxy((req: any) => {
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
