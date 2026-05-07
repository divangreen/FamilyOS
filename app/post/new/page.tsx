import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NewPostForm } from './NewPostForm'

export default async function NewPostPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: subVillages } = await supabase
    .from('sub_villages')
    .select('id, name')
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto">
        {/* Nav */}
        <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/feed"
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 rounded"
          >
            ← Back to feed
          </Link>
        </div>

        <div className="p-6 bg-white dark:bg-gray-900 m-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            New Post
          </h1>
          <NewPostForm
            userId={user.id}
            subVillages={subVillages ?? []}
          />
        </div>
      </div>
    </div>
  )
}
