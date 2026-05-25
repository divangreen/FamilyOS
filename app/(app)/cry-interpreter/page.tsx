import { CryInterpreter } from '@/components/cry/CryInterpreter'

export default function CryInterpreterPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Baby Cry Interpreter</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI-powered cry analysis. Record 5–15 seconds for best results.
          </p>
        </div>
        <CryInterpreter />
      </div>
    </div>
  )
}
