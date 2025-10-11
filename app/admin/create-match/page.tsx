import MatchCreationForm from '@/components/MatchCreationForm'
import ProtectedRoute from '@/components/ProtectedRoute'

function CreateMatchPageContent() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">⚽ Football Stats</h1>
          <p className="mt-2 text-sm text-gray-600">Create New Match</p>
        </div>

        <div className="flex justify-center">
          <MatchCreationForm />
        </div>
      </div>
    </div>
  )
}

export default function CreateMatchPage() {
  return (
    <ProtectedRoute requireAdmin={true} requireApproved={true}>
      <CreateMatchPageContent />
    </ProtectedRoute>
  )
}
