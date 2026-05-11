import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  MessageCircle,
  ThumbsUp,
  TrendingUp,
  Crown,
  Users,
  BookOpen,
  ChevronRight,
  Ghost,
  Star,
  Flame,
} from "lucide-react";
import { HeroSearch } from "@/components/landing/HeroSearch";
import { AskFAB } from "@/components/landing/AskFAB";

// ─── Static demo data ─────────────────────────────────────────────────────────

interface DemoPost {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  authorType: "expert" | "ghost" | "community";
  specialty?: string;
  trustScore: number;
  village: string;
  villageIcon: string;
  replies: number;
  helpful: number;
  timeAgo: string;
}

const DEMO_POSTS: DemoPost[] = [
  {
    id: "1",
    title: "When should babies start solid foods? Evidence-based guidance",
    excerpt:
      "Most guidelines recommend starting solids around 6 months, but readiness signs matter more than the calendar. Look for head control, interest in food, and the ability to sit with minimal support.",
    author: "Dr. Sarah Mitchell",
    authorType: "expert",
    specialty: "Pediatrics",
    trustScore: 2841,
    village: "Newborns",
    villageIcon: "🍼",
    replies: 47,
    helpful: 312,
    timeAgo: "2h ago",
  },
  {
    id: "2",
    title: "I haven't slept more than 3 hours in four months — is this normal?",
    excerpt:
      "Nobody warned me about the fourth trimester. I love my baby more than anything but I'm running on empty. Has anyone found strategies that actually work for a baby who refuses to sleep alone?",
    author: "Anonymous",
    authorType: "ghost",
    trustScore: 0,
    village: "Mental Health",
    villageIcon: "💚",
    replies: 89,
    helpful: 201,
    timeAgo: "5h ago",
  },
  {
    id: "3",
    title: "Screen time at age 5 — what limits have worked for your family?",
    excerpt:
      "We've been struggling with the transition back to school after a summer of more TV. Curious what routines other parents have found sustainable — not looking for judgment, just practical ideas.",
    author: "James T.",
    authorType: "community",
    trustScore: 847,
    village: "School Age",
    villageIcon: "📚",
    replies: 33,
    helpful: 156,
    timeAgo: "8h ago",
  },
];

interface Tribe {
  name: string;
  icon: string;
  postCount: number;
  trending: boolean;
}

const TRENDING_TRIBES: Tribe[] = [
  { name: "Newborns", icon: "🍼", postCount: 1234, trending: true },
  { name: "Toddlers", icon: "🦕", postCount: 987, trending: true },
  { name: "Mental Health", icon: "💚", postCount: 756, trending: true },
  { name: "School Age", icon: "📚", postCount: 521, trending: false },
  { name: "Single Parents", icon: "⭐", postCount: 389, trending: false },
];

interface Elder {
  rank: number;
  name: string;
  role: string;
  trustScore: number;
  isExpert: boolean;
}

const VILLAGE_ELDERS: Elder[] = [
  {
    rank: 1,
    name: "Dr. Sarah M.",
    role: "Pediatrics",
    trustScore: 4281,
    isExpert: true,
  },
  {
    rank: 2,
    name: "James T.",
    role: "Child Psychology",
    trustScore: 3892,
    isExpert: true,
  },
  {
    rank: 3,
    name: "Ana R.",
    role: "Nutrition",
    trustScore: 2104,
    isExpert: true,
  },
  {
    rank: 4,
    name: "Maya K.",
    role: "Parent of 3",
    trustScore: 1876,
    isExpert: false,
  },
  {
    rank: 5,
    name: "Chen W.",
    role: "Parent of 2",
    trustScore: 1542,
    isExpert: false,
  },
];

// ─── Micro-components ─────────────────────────────────────────────────────────

function ExpertFlair({ specialty }: { specialty: string }) {
  return (
    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-2.5 py-0.5 text-xs font-semibold ui-sans">
      <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
      {specialty}
    </span>
  );
}

function TrustBadge({ score }: { score: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2.5 py-0.5 text-xs font-semibold ui-sans"
      title={`Trust Score: ${score.toLocaleString()} points`}
    >
      <Star
        className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0"
        aria-hidden="true"
      />
      {score.toLocaleString()}
    </span>
  );
}

function GhostFlair() {
  return (
    <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2.5 py-0.5 text-xs font-semibold ui-sans">
      <Ghost className="h-3 w-3 shrink-0" aria-hidden="true" />
      Anonymous
    </span>
  );
}

function FeedPostCard({ post }: { post: DemoPost }) {
  const avatarStyle =
    post.authorType === "expert"
      ? "bg-emerald-800 text-white"
      : post.authorType === "ghost"
        ? "bg-violet-100 text-violet-700"
        : "bg-slate-200 text-slate-600";

  return (
    <article className="bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-shadow overflow-hidden">
      {/* Village + timestamp */}
      <div className="px-5 pt-4 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 ui-sans">
          {post.villageIcon} {post.village}
        </span>
        <span className="text-xs text-slate-400 ui-sans">{post.timeAgo}</span>
      </div>

      <div className="px-5 py-4">
        {/* Title */}
        <h3
          className="font-semibold text-lg text-slate-900 leading-snug mb-2 hover:text-emerald-800 transition-colors cursor-default"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-2 ui-sans">
          {post.excerpt}
        </p>

        {/* Author row with flairs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ui-sans ${avatarStyle}`}
            aria-hidden="true"
          >
            {post.authorType === "ghost" ? "👻" : post.author.charAt(0)}
          </div>

          <span className="text-sm font-medium text-slate-700 ui-sans">
            {post.author}
          </span>

          {post.authorType === "expert" && post.specialty && (
            <ExpertFlair specialty={post.specialty} />
          )}
          {post.authorType === "ghost" && <GhostFlair />}
          {post.authorType !== "ghost" && post.trustScore > 0 && (
            <TrustBadge score={post.trustScore} />
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="px-5 pb-4 flex items-center gap-5 text-sm text-slate-500 ui-sans border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1.5">
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          {post.helpful} helpful
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {post.replies} replies
        </span>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated users go straight to the feed
  //if (user) redirect('/feed')

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <span
              className="text-xl font-bold text-emerald-800"
              style={{ fontFamily: "Georgia, serif" }}
            >
              The Village
            </span>
            <p className="text-xs text-slate-400 tracking-widest uppercase hidden sm:block ui-sans mt-0.5">
              A space for parents
            </p>
          </div>

          <nav
            className="flex items-center gap-3 ui-sans"
            aria-label="Site navigation"
          >
            <Link
              href="/login"
              className="text-sm text-slate-600 hover:text-emerald-800 font-medium transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-emerald-800 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
            >
              Join the Village
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-emerald-800 py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-emerald-300 text-xs tracking-widest uppercase mb-5 font-semibold ui-sans">
            Trusted by 10,000+ parents
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Real answers from
            <br className="hidden sm:block" /> real parents &amp; experts
          </h1>
          <p className="text-emerald-100 text-lg sm:text-xl mb-10 leading-relaxed max-w-xl mx-auto ui-sans">
            A high-trust community where verified professionals and experienced
            parents share honest guidance — safely and anonymously when you need
            it.
          </p>

          <HeroSearch />

          <p className="text-emerald-300/80 text-sm mt-5 ui-sans">
            Popular: sleep training, solid foods, screen time, postpartum
            recovery
          </p>
        </div>
      </section>

      {/* ── Social proof strip ────────────────────────────────────────────── */}
      <section className="bg-amber-50 border-y border-amber-100 py-8 px-4">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            {
              icon: (
                <BookOpen className="h-5 w-5 text-emerald-800 mx-auto mb-1" />
              ),
              value: "5,000+",
              label: "Expert guides",
            },
            {
              icon: (
                <ShieldCheck className="h-5 w-5 text-emerald-800 mx-auto mb-1" />
              ),
              value: "200+",
              label: "Verified experts",
            },
            {
              icon: <Users className="h-5 w-5 text-emerald-800 mx-auto mb-1" />,
              value: "10,000+",
              label: "Parents helped",
            },
          ].map(({ icon, value, label }) => (
            <div key={label}>
              {icon}
              <p
                className="text-2xl sm:text-3xl font-bold text-emerald-800"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {value}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5 ui-sans">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feed preview + Sidebar ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex gap-8 items-start">
          {/* Feed column */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-bold text-slate-800"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Recent Discussions
              </h2>
              <Link
                href="/signup"
                className="text-sm text-emerald-800 hover:text-emerald-700 font-medium flex items-center gap-1 transition-colors ui-sans"
              >
                See all <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="space-y-4">
              {DEMO_POSTS.map((post) => (
                <FeedPostCard key={post.id} post={post} />
              ))}
            </div>

            {/* Join CTA */}
            <div className="mt-6 bg-white border-2 border-dashed border-emerald-200 rounded-2xl p-8 text-center">
              <p
                className="text-slate-700 font-medium mb-1"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Want to join the conversation?
              </p>
              <p className="text-slate-500 text-sm mb-5 ui-sans">
                Join 10,000+ parents — it takes 30 seconds and it's free
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors ui-sans"
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Join the Village
              </Link>
            </div>
          </div>

          {/* Sidebar — hidden on mobile, visible lg+ */}
          <aside
            className="w-72 shrink-0 hidden lg:flex flex-col gap-5"
            aria-label="Community highlights"
          >
            {/* Trending Tribes */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 tracking-wide ui-sans">
                  Trending Tribes
                </h3>
                <Flame className="h-4 w-4 text-orange-500" aria-hidden="true" />
              </div>

              <ul>
                {TRENDING_TRIBES.map((tribe) => (
                  <li
                    key={tribe.name}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <Link
                      href="/signup"
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group"
                    >
                      <span className="text-lg" aria-hidden="true">
                        {tribe.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 group-hover:text-emerald-800 transition-colors truncate ui-sans">
                          {tribe.name}
                        </p>
                        <p className="text-xs text-slate-400 ui-sans">
                          {tribe.postCount.toLocaleString()} posts
                        </p>
                      </div>
                      {tribe.trending && (
                        <TrendingUp
                          className="h-3.5 w-3.5 text-emerald-600 shrink-0"
                          aria-label="Trending"
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Village Elders leaderboard */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 tracking-wide ui-sans">
                  Village Elders
                </h3>
                <Crown className="h-4 w-4 text-amber-500" aria-hidden="true" />
              </div>

              <ul>
                {VILLAGE_ELDERS.map((elder) => {
                  const rankColor =
                    elder.rank === 1
                      ? "text-amber-500"
                      : elder.rank === 2
                        ? "text-slate-400"
                        : elder.rank === 3
                          ? "text-orange-600"
                          : "text-slate-300";

                  return (
                    <li
                      key={elder.name}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <div className="flex items-center gap-3 px-5 py-3">
                        {/* Rank */}
                        <span
                          className={`text-xs font-bold w-5 text-center shrink-0 ui-sans ${rankColor}`}
                        >
                          #{elder.rank}
                        </span>

                        {/* Avatar */}
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ui-sans ${
                            elder.isExpert
                              ? "bg-emerald-800 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                          aria-hidden="true"
                        >
                          {elder.name.charAt(0)}
                        </div>

                        {/* Name + role */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-semibold text-slate-800 truncate ui-sans">
                              {elder.name}
                            </p>
                            {elder.isExpert && (
                              <ShieldCheck
                                className="h-3 w-3 text-emerald-800 shrink-0"
                                aria-label="Verified Expert"
                              />
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate ui-sans">
                            {elder.role}
                          </p>
                        </div>

                        {/* Trust score */}
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-amber-700 ui-sans">
                            {elder.trustScore.toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-400 ui-sans">pts</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-center">
                <p className="text-xs text-amber-800 ui-sans">
                  Earn trust by helping others in the village
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Join CTA banner ───────────────────────────────────────────────── */}
      <section className="bg-emerald-800 py-16 px-4 text-center">
        <h2
          className="text-3xl sm:text-4xl font-bold text-white mb-4"
          style={{ fontFamily: "Georgia, serif" }}
        >
          You don't have to figure it out alone
        </h2>
        <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto ui-sans">
          Join a community that gets it — because they've lived it.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-white text-emerald-800 hover:bg-amber-50 font-bold px-8 py-4 rounded-2xl text-lg transition-colors shadow-lg ui-sans"
        >
          <Users className="h-5 w-5" aria-hidden="true" />
          Join the Village for free
        </Link>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 ui-sans">
          <p
            className="font-bold text-slate-700"
            style={{ fontFamily: "Georgia, serif" }}
          >
            The Village
          </p>
          <nav className="flex gap-6" aria-label="Footer links">
            <Link
              href="/login"
              className="hover:text-emerald-800 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="hover:text-emerald-800 transition-colors"
            >
              Sign up
            </Link>
            <Link
              href="/apply-expert"
              className="hover:text-emerald-800 transition-colors"
            >
              Apply as Expert
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} The Village</p>
        </div>
      </footer>

      {/* ── Mobile FAB (client component, hidden lg+) ─────────────────────── */}
      <AskFAB />
    </div>
  );
}
