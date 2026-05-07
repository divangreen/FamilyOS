'use client'

import { type Comment, type UserRole } from '@/lib/supabase/types'
import { CommentCard } from './CommentCard'

interface CommentThreadProps {
  comments: (Comment & {
    author?: { displayName: string; role: UserRole; isVerified: boolean }
    ghostAlias?: string | null
  })[]
  onHelpfulVote?: (commentId: string) => void
}

function buildCommentTree(
  comments: CommentThreadProps['comments'],
  parentId: string | null = null
): typeof comments {
  return comments
    .filter((c) => c.parent_id === parentId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export function CommentThread({ comments, onHelpfulVote }: CommentThreadProps) {
  const renderComments = (parentId: string | null = null, depth: number = 0) => {
    const threadComments = buildCommentTree(comments, parentId)

    return threadComments.map((comment) => (
      <div key={comment.id}>
        <CommentCard
          author={
            comment.author || {
              displayName: 'Unknown',
              role: 'guardian' as UserRole,
              isVerified: false,
            }
          }
          body={comment.body}
          helpfulCount={comment.helpful_count}
          createdAt={comment.created_at}
          depth={comment.depth}
          isGhost={comment.is_ghost_post}
          ghostAlias={comment.ghostAlias}
          onHelpfulVote={() => onHelpfulVote?.(comment.id)}
        >
          {renderComments(comment.id, depth + 1)}
        </CommentCard>
      </div>
    ))
  }

  return <div className="space-y-2">{renderComments()}</div>
}
