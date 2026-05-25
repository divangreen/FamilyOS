import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { post_id } = await request.json();

    if (!post_id) {
      return NextResponse.json({ error: 'post_id required' }, { status: 400 });
    }

    // Vote toggle pattern
    const { error: voteError } = await supabase
      .from('popular_votes')
      .insert({ post_id, user_id: user.id });

    let action: 'added' | 'removed' = 'added';

    if (voteError?.code === '23505') { // Unique constraint violation
      await supabase
        .from('popular_votes')
        .delete()
        .match({ post_id, user_id: user.id });
      action = 'removed';
    } else if (voteError) {
      console.error('Vote error:', voteError);
      return NextResponse.json({ error: 'Vote failed' }, { status: 500 });
    }

    // Update count
    const { error: countError } = await supabase.rpc('adjust_popular_count', { 
      p_post_id: post_id 
    });

    if (countError) {
      console.error('Count update error:', countError);
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const post_ids = searchParams.get('post_ids')?.split(',') || [];

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ voted: [] });
    }

    const { data: votes } = await supabase
      .from('popular_votes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', post_ids);

    return NextResponse.json({ 
      voted: votes?.map((v: any) => v.post_id) || [] 
    });
  } catch (error) {
    console.error('Error fetching votes:', error);
    return NextResponse.json({ voted: [] });
  }
}
