import Link from 'next/link';

export function PostHistory({ posts }: { posts: any[] }) {
  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        No posts yet
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold">Posts</h2>
      </div>
      
      <div className="divide-y">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.id}`}
            className="block p-6 hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-medium text-lg mb-2">{post.title}</h3>
            <p className="text-gray-600 text-sm line-clamp-2 mb-3">
              {post.content}
            </p>
            <div className="flex gap-4 text-sm text-gray-500">
              <span>👍 {post.helpful_count}</span>
              <span>⭐ {post.popular_count}</span>
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
