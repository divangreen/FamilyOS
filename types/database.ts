// Canonical types live in lib/supabase/types.ts (co-located with the Supabase clients).
// This barrel re-exports them for consumers that prefer the types/ directory convention.
// Run `npx supabase gen types typescript --local > lib/supabase/types.ts` to regenerate.
export type {
  Database,
  // Scalar enums
  UserRole,
  VoteType,
  TargetType,
  ApplicationStatus,
  NotificationType,
  // Convenience row aliases
  PublicPost,   // posts via public_posts view (ghost-safe)
  Comment,
  User,
  SubVillage,
  ExpertApplication,
  Vote,
  Notification,
} from '@/lib/supabase/types'
