import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fixBenchmarkSessionsTable() {
  console.log('🔧 Fixing benchmark_sessions table...');
  
  // Add missing columns to benchmark_sessions
  const addColumnsSql = `
    ALTER TABLE benchmark_sessions 
    ADD COLUMN IF NOT EXISTS mcp_version VARCHAR(20) DEFAULT '1.0',
    ADD COLUMN IF NOT EXISTS session_type VARCHAR(50) DEFAULT 'manual';
  `;
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_statement: addColumnsSql
    });
    
    if (error) {
      console.error('❌ Error adding columns:', error);
    } else {
      console.log('✅ Successfully added missing columns to benchmark_sessions');
    }
  } catch (err) {
    console.error('❌ Exception adding columns:', err);
  }
  
  // Test the table now
  try {
    const { data, error } = await supabase
      .from('benchmark_sessions')
      .select('*')
      .limit(1);
      
    console.log('✅ Table test:', { data, error });
  } catch (err) {
    console.error('❌ Table test failed:', err);
  }
}

fixBenchmarkSessionsTable();
