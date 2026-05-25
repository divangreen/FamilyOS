import { CoachChat } from '@/components/coach/CoachChat'

export default function CoachPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Wellness Companion</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            A safe space to talk about the challenges of parenting. Not a medical service.
          </p>
        </div>
        <CoachChat />
      </div>
    </div>
  )
}
