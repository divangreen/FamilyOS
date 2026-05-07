import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    return await run()
  } catch (e) {
    console.error('[seed] uncaught error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

async function run() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // --- Auth users ---
  const authUsers = [
    {
      email: "sarah.m@village.test",
      password: "Test1234!",
      display_name: "Sarah Mitchell",
      role: "mom" as const,
    },
    {
      email: "mike.d@village.test",
      password: "Test1234!",
      display_name: "Mike Davidson",
      role: "dad" as const,
    },
    {
      email: "jen.g@village.test",
      password: "Test1234!",
      display_name: "Jennifer Garcia",
      role: "guardian" as const,
    },
    {
      email: "dr.chen@village.test",
      password: "Test1234!",
      display_name: "Dr. Amy Chen",
      role: "expert" as const,
    },
    {
      email: "tom.p@village.test",
      password: "Test1234!",
      display_name: "Tom Park",
      role: "dad" as const,
    },
  ];

  const userIds: Record<string, string> = {};

  for (const u of authUsers) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", u.email)
      .maybeSingle();

    if (existing) {
      userIds[u.email] = (existing as { id: string }).id;
      continue;
    }

    let authUserId: string

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { display_name: u.display_name, role: u.role },
    });

    if (error) {
      if (!error.message.includes('already been registered'))
        return NextResponse.json(
          { error: error.message, step: "auth user: " + u.email },
          { status: 500 },
        );
      // user exists in auth but not in public.users — look them up
      const { data: list } = await supabase.auth.admin.listUsers()
      const found = list?.users.find((au) => au.email === u.email)
      if (!found)
        return NextResponse.json({ error: 'Could not find existing auth user: ' + u.email }, { status: 500 })
      authUserId = found.id
    } else {
      authUserId = data.user.id
    }

    userIds[u.email] = authUserId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: profileError } = await (supabase as any)
      .from("users")
      .upsert({
        id: authUserId,
        email: u.email,
        display_name: u.display_name,
        role: u.role,
        is_verified_expert: u.role === "expert",
        cred_score: u.role === "expert" ? 120 : Math.floor(Math.random() * 60),
      });

    if (profileError)
      return NextResponse.json(
        { error: profileError.message, step: "profile: " + u.email },
        { status: 500 },
      );
  }

  const [sarah, mike, jen, drChen, tom] = [
    userIds["sarah.m@village.test"],
    userIds["mike.d@village.test"],
    userIds["jen.g@village.test"],
    userIds["dr.chen@village.test"],
    userIds["tom.p@village.test"],
  ];

  // --- Sub-villages ---
  const villages = [
    {
      name: "Sleep & Rest",
      description:
        "Naps, bedtime routines, sleep regressions, and everything in between.",
    },
    {
      name: "Feeding & Nutrition",
      description:
        "Breastfeeding, formula, solids, picky eaters, and meal ideas.",
    },
    {
      name: "Development & Milestones",
      description:
        "Motor skills, language, social development, and school readiness.",
    },
    {
      name: "Health & Safety",
      description:
        "Illness, vaccines, childproofing, and when to call the doctor.",
    },
  ];

  const { data: insertedVillages, error: villageError } = await supabase
    .from("sub_villages")
    .upsert(villages, { onConflict: "name", ignoreDuplicates: true })
    .select();

  if (villageError)
    return NextResponse.json(
      { error: villageError.message, step: "villages" },
      { status: 500 },
    );

  const { data: allVillages } = await supabase
    .from("sub_villages")
    .select("id, name");
  const villageMap: Record<string, string> = {};
  for (const v of allVillages ?? []) villageMap[v.name] = v.id;

  const sleepV = villageMap["Sleep & Rest"];
  const feedV = villageMap["Feeding & Nutrition"];
  const devV = villageMap["Development & Milestones"];
  const healthV = villageMap["Health & Safety"];

  // --- Ghost aliases ---
  const ghostAliases = [
    { user_id: sarah, alias_name: "BraveOwl42" },
    { user_id: mike, alias_name: "CalmBear17" },
  ];

  const { data: insertedAliases } = await supabase
    .from("ghost_aliases")
    .upsert(ghostAliases, { onConflict: "alias_name", ignoreDuplicates: true })
    .select();

  const { data: allAliases } = await supabase
    .from("ghost_aliases")
    .select("id, alias_name");
  const aliasMap: Record<string, string> = {};
  for (const a of allAliases ?? []) aliasMap[a.alias_name] = a.id;

  // --- Posts ---
  const now = new Date();
  const daysAgo = (d: number) =>
    new Date(now.getTime() - d * 86400000).toISOString();

  const postsToInsert = [
    {
      author_id: sarah,
      sub_village_id: sleepV,
      title: "18-month sleep regression is destroying us — any tips?",
      body: "My toddler used to sleep 11 hours straight and now wakes up 3-4 times a night screaming. We're on week 3. I've read it usually lasts 2-6 weeks but I'm running on fumes. Has anyone made it through this? What actually helped you survive it?",
      is_ghost_post: false,
      helpful_count: 24,
      popular_count: 8,
      created_at: daysAgo(2),
    },
    {
      author_id: drChen,
      sub_village_id: healthV,
      title:
        "When to go to the ER vs urgent care vs wait it out — a practical guide",
      body: "As a pediatrician I see a lot of anxiety around this decision. Here's my quick guide:\n\n**Go to the ER immediately:** fever >104°F in any child, difficulty breathing, seizures, loss of consciousness, severe allergic reaction, head injury with vomiting.\n\n**Urgent care is fine for:** ear infections, mild cuts, strep symptoms, rashes without breathing issues, fever in kids over 3 months that's manageable.\n\n**Call your pediatrician first:** most other concerns. We'd rather you call than guess.",
      is_ghost_post: false,
      helpful_count: 89,
      popular_count: 34,
      created_at: daysAgo(5),
    },
    {
      author_id: jen,
      sub_village_id: feedV,
      title: "Starting solids at 5 months — are we too early?",
      body: 'Our pediatrician mentioned we could start solids "around 6 months" but our baby is showing so much interest in food. She grabs at our plates, watches us eat intently, and can sit with support. She\'s 5 months and 1 week. Should we wait the extra 3 weeks or is it okay to start now?',
      is_ghost_post: false,
      helpful_count: 15,
      popular_count: 3,
      created_at: daysAgo(1),
    },
    {
      author_id: mike,
      sub_village_id: devV,
      title: "My 2-year-old isn't talking yet — when did your kids start?",
      body: "Our son is 24 months and only says about 10-15 words. Our pediatrician referred us to a speech therapist but the wait is 3 months. I'm not panicking but I'd love to hear from parents who've been through late talking. Did it just click at some point? Any activities that helped?",
      is_ghost_post: false,
      helpful_count: 31,
      popular_count: 12,
      created_at: daysAgo(3),
    },
    {
      author_id: sarah,
      sub_village_id: sleepV,
      title: "Anyone else co-sleeping by accident?",
      body: "We swore we'd never co-sleep. Now my 8 month old ends up in our bed every single night because it's the only way any of us get more than 2 hours of sleep. Not looking for judgment, just solidarity. How did you eventually transition back to the crib if you did?",
      is_ghost_post: true,
      ghost_alias_id: aliasMap["BraveOwl42"],
      helpful_count: 47,
      popular_count: 19,
      created_at: daysAgo(4),
    },
    {
      author_id: tom,
      sub_village_id: feedV,
      title: "Picky eater strategies that actually worked for us",
      body: "My 4-year-old used to eat maybe 8 foods. After 6 months of food chaining and zero pressure at the table, she's up to 30+ foods. Here's what worked for us:\n\n1. Always have one safe food on the plate\n2. Exposure without pressure — she just had to look at new food\n3. Involved her in grocery shopping and picking veggies\n4. Ate the same foods ourselves in front of her\n5. No bribing, no \"one more bite\"\n\nHappy to answer questions.",
      is_ghost_post: false,
      helpful_count: 62,
      popular_count: 28,
      created_at: daysAgo(7),
    },
  ];

  const { data: insertedPosts, error: postError } = await supabase
    .from("posts")
    .insert(postsToInsert)
    .select();

  if (postError)
    return NextResponse.json(
      { error: postError.message, step: "posts" },
      { status: 500 },
    );

  const p = insertedPosts;
  const post0 = p[0].id;
  const post1 = p[1].id;
  const post2 = p[2].id;
  const post3 = p[3].id;
  const post4 = p[4].id;
  const post5 = p[5].id;

  // --- Comments ---
  const commentsToInsert = [
    // Thread on sleep regression post
    {
      post_id: post0,
      author_id: mike,
      body: "We went through this at 18 months too. Honestly the thing that helped most was just shortening wake windows by about 20 minutes and moving bedtime earlier by 30 minutes. Counterintuitive but it worked within a week.",
      depth: 0,
      is_ghost_post: false,
      helpful_count: 11,
      created_at: daysAgo(1),
    },
    {
      post_id: post0,
      author_id: drChen,
      body: "The 18-month regression is one of the most intense because it coincides with a huge developmental leap — language explosion, increased awareness of separation. It's completely normal and temporary. Consistency in your response is the key; the approach matters less than sticking to it.",
      depth: 0,
      is_ghost_post: false,
      helpful_count: 18,
      created_at: daysAgo(1),
    },
    {
      post_id: post0,
      author_id: jen,
      body: "Solidarity. We're just coming out of it at 19 months. Week 4 was the turning point for us with no changes — it just passed. Hang in there.",
      depth: 0,
      is_ghost_post: false,
      helpful_count: 7,
      created_at: daysAgo(0),
    },

    // Thread on solids post
    {
      post_id: post2,
      author_id: drChen,
      body: 'The AAP recommendation is "around 6 months" for a reason — readiness signs matter more than the exact date. The three signs to look for: can sit with minimal support, has lost the tongue-thrust reflex, and shows interest in food. If all three are present at 5 months, you can have a conversation with your pediatrician about starting. Three weeks won\'t make a huge difference either way.',
      depth: 0,
      is_ghost_post: false,
      helpful_count: 22,
      created_at: daysAgo(0),
    },
    {
      post_id: post2,
      author_id: sarah,
      body: "We started at 5.5 months with our second. Our ped was fine with it given she showed all the readiness signs. We started with single-ingredient purees and it went really smoothly.",
      depth: 0,
      is_ghost_post: false,
      helpful_count: 9,
      created_at: daysAgo(0),
    },

    // Thread on late talking post
    {
      post_id: post3,
      author_id: sarah,
      body: "My son was similar — 20 words at 24 months. We did 6 months of speech therapy and it was genuinely life-changing. Even while you wait, the therapist can give you a home program. Ask them specifically about that when you call.",
      depth: 0,
      is_ghost_post: false,
      helpful_count: 14,
      created_at: daysAgo(2),
    },
    {
      post_id: post3,
      author_id: tom,
      body: "Look up \"floor time\" play — it's a speech therapy technique parents can do at home. Basically follow your child's lead in play, narrate what they're doing, and pause to give them space to fill in words. We used it between sessions.",
      depth: 0,
      is_ghost_post: false,
      helpful_count: 19,
      created_at: daysAgo(2),
    },
    {
      post_id: post3,
      author_id: mike,
      body: "Is he watching a lot of screens? We cut screens cold turkey and our son's words doubled in 3 weeks. Not saying that's your situation but it was ours.",
      depth: 0,
      is_ghost_post: true,
      ghost_alias_id: aliasMap["CalmBear17"],
      helpful_count: 8,
      created_at: daysAgo(1),
    },

    // Thread on picky eater post
    {
      post_id: post5,
      author_id: jen,
      body: "Food chaining was a game changer for us too. Can you explain how you transitioned from one food to the next? Like how similar did the new food need to be?",
      depth: 0,
      is_ghost_post: false,
      helpful_count: 5,
      created_at: daysAgo(6),
    },
    {
      post_id: post5,
      author_id: drChen,
      body: "This is a great list. I'd add: eating together as a family as often as possible. Children are hardwired to eat what the group eats. Even if you're eating something different, being present at the table matters.",
      depth: 0,
      is_ghost_post: false,
      helpful_count: 16,
      created_at: daysAgo(6),
    },
  ];

  const { error: commentError } = await supabase
    .from("comments")
    .insert(commentsToInsert);

  if (commentError)
    return NextResponse.json(
      { error: commentError.message, step: "comments" },
      { status: 500 },
    );

  return NextResponse.json({
    ok: true,
    summary: {
      users: Object.keys(userIds).length,
      villages: Object.keys(villageMap).length,
      posts: insertedPosts.length,
      comments: commentsToInsert.length,
    },
  });
}
