import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkTableColumns() {
  // Try to insert with minimal columns first
  const { data, error } = await supabase
    .from('benchmark_sessions')
    .insert({
      session_name: 'Test Session',
      description: 'Test Description'
    })
    .select()
    .single();
    
  console.log('Minimal insert test:', { data, error });
  
  // If that worked, try cleanup
  if (data) {
    const { error: deleteError } = await supabase
      .from('benchmark_sessions')
      .delete()
      .eq('id', data.id);
    console.log('Cleanup:', { deleteError });
  }
}

checkTableColumns();
