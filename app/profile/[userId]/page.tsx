import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { EditProfileForm } from './EditProfileForm';
import { PostHistory } from './PostHistory';

export default async function ProfilePage({ 
  params 
}: { 
  params: { userId: string } 
}) {
  const supabase = createServerComponentClient({ cookies });
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === params.userId;

  // Get profile data
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.userId)
    .single();

  if (error || !profile) {
    notFound();
  }

  // Get user's posts (non-ghost only for privacy)
  const { data: posts } = await supabase
    .from('public_posts')
    .select('*')
    .eq('author_id', params.userId)
    .eq('is_ghost_post', false)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
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

          {/* Info */}
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

      {/* Edit Form (only for own profile) */}
      {isOwnProfile && <EditProfileForm profile={profile} />}

      {/* Post History */}
      <PostHistory posts={posts || []} />
    </div>
  );
}
