import { LoginForm } from '@/components/auth/login-form'
import { LocaleSwitcher } from '@/components/locale-switcher'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="w-full max-w-md mb-4 flex justify-end">
        <LocaleSwitcher />
      </div>
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <LoginForm />
      </div>
    </div>
  )
}
