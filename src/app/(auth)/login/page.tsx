import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            MuMuAINovel
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            AI-Powered Novel Writing Assistant
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
