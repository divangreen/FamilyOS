import { createClient } from '@/lib/supabase/server'
import type { PublicPost } from '@/lib/supabase/types'
import { notFound } from 'next/navigation'
import { EditProfileForm } from './EditProfileForm'
import { PostHistory } from './PostHistory'

type Profile = {
  id: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  expert_verified: boolean | null
  created_at: string
}

export default async function ProfilePage({
  params
}: {
  params: { userId: string }
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const isOwnProfile = user?.id === params.userId

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', params.userId)
    .single() as { data: Profile | null; error: unknown }

  if (error || !profile) {
    notFound()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (supabase as any)
    .from('public_posts')
    .select('*')
    .eq('author_id', params.userId)
    .eq('is_ghost_post', false)
    .order('created_at', { ascending: false })
    .limit(20) as { data: PublicPost[] | null }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || 'User avatar'}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-3xl text-gray-500">
                  {profile.display_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {profile.display_name || 'Anonymous User'}
              </h1>
              {profile.expert_verified && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  ✓ Expert
                </span>
              )}
            </div>

            {profile.bio && (
              <p className="text-gray-600 mt-2">{profile.bio}</p>
            )}

            <div className="flex gap-4 mt-4 text-sm text-gray-500">
              <span>{posts?.length || 0} posts</span>
              <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile && <EditProfileForm profile={profile} />}

      <PostHistory posts={posts || []} />
    </div>
  )
}
