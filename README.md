# The Village

A community platform for parents — built so caregivers can ask questions, share experiences, and get advice from verified experts without judgment.

---

## Features

- **Role-based community** — Members join as Mom, Dad, Guardian, or Expert, each with a distinct identity in the feed
- **Verified experts** — Pediatricians, therapists, and specialists can apply for verified status; their posts are badged so parents know who they're hearing from
- **Ghost posting** — Post or comment anonymously using a generated alias (e.g. "BraveOwl42") when the topic is too personal to share under your name
- **Threaded comments** — Conversations nest up to 5 levels deep so discussions stay organised
- **Helpful voting** — Upvote posts and comments that genuinely help; counts are surfaced in the feed
- **Sub-villages** — Topics are grouped into focused spaces: Sleep & Rest, Feeding & Nutrition, Development & Milestones, Health & Safety, and more
- **Feed filters** — Filter by role, sub-village, and sort by most recent, most helpful, or most popular
- **Expert applications** — Users can submit credentials for admin review directly in the app

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS |
| Icons | Lucide React |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/divangreen/FamilyOS.git
cd FamilyOS
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Fill in your Supabase project credentials in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Set up the database

Run the migration in your Supabase SQL editor:

```
supabase/migrations/001_initial.sql
```

### 5. Seed test data (optional)

Start the dev server, then POST to the seed endpoint:

```bash
npm run dev
curl -X POST http://localhost:3000/api/seed
```

This creates 5 test users, 4 sub-villages, 6 posts, and 10 comments.

**Test accounts** (password: `Test1234!`):
- `sarah.m@village.test` — Mom
- `mike.d@village.test` — Dad
- `jen.g@village.test` — Guardian
- `dr.chen@village.test` — Verified Expert
- `tom.p@village.test` — Dad

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/
├── (auth)/          # Login & signup pages
├── api/             # API routes (feed, votes, ghost aliases, expert applications, seed)
├── feed/            # Main feed page
├── post/            # Post detail + reply form
└── apply-expert/    # Expert application form

components/          # Shared UI components
lib/
├── supabase/        # Supabase client, server client, types
├── ghost.ts         # Ghost alias generation
└── utils.ts

supabase/
└── migrations/      # Database schema
```

---

## Database Schema

- **users** — Profiles linked to Supabase auth, with role and credibility score
- **sub_villages** — Topic categories
- **posts** — Community posts, with ghost posting support
- **comments** — Threaded comments (max depth 5)
- **ghost_aliases** — Anonymous aliases per user
- **reputation_votes** — Helpful and popular votes on posts and comments
- **expert_applications** — Credential submissions for expert verification
- **public_posts** (view) — Feed-safe view that strips author identity on ghost posts

---

## Roadmap

- [ ] Notifications
- [ ] Direct messaging
- [ ] Bookmarked posts
- [ ] Admin dashboard for expert application review
- [ ] Mobile app

---

## License

MIT
