import AdminCreationUtility from '@/components/AdminCreationUtility'
import { redirect } from 'next/navigation'

export default function CreateAdminPage() {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">⚽ Football Stats</h1>
          <p className="mt-2 text-sm text-gray-600">Admin Account Creation</p>
        </div>

        <AdminCreationUtility />
      </div>
    </div>
  )
}
