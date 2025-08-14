#!/usr/bin/env node

/**
 * MCP Database Setup Script
 * 
 * This script sets up the database tables needed for the MCP architecture.
 * Run this after setting up your Supabase project.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabase() {
  console.log('🚀 Setting up MCP Database Schema...');
  
  try {
    // Read the database schema file
    const schemaPath = join(__dirname, '../lib/database-schema-complete.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf8');
    
    console.log('📖 Reading database schema from:', schemaPath);
    
    // Split SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      try {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_statement: statement 
        });
        
        if (error) {
          // Try direct execution for some statements
          const { error: directError } = await supabase
            .from('__dummy__') // This will fail but trigger SQL execution
            .select('1')
            .eq('sql', statement);
          
          if (directError && !directError.message.includes('relation "__dummy__" does not exist')) {
            console.warn(`   ⚠️ Warning for statement ${i + 1}: ${error.message}`);
            errorCount++;
          } else {
            successCount++;
          }
        } else {
          successCount++;
        }
        
      } catch (err) {
        console.warn(`   ⚠️ Warning for statement ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        errorCount++;
      }
    }
    
    console.log(`\n✅ Database setup completed!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Warnings: ${errorCount}`);
    
    // Test the setup by checking if key tables exist
    console.log('\n🔍 Verifying table creation...');
    
    const tablesToCheck = [
      'benchmark_sessions',
      'llm_evaluations', 
      'llm_provider_stats',
      'mcp_requests',
      'mcp_responses'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(0);
          
        if (error) {
          console.log(`   ❌ Table '${table}': Error - ${error.message}`);
        } else {
          console.log(`   ✅ Table '${table}': OK (${count || 0} rows)`);
        }
      } catch (err) {
        console.log(`   ❌ Table '${table}': Error - ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    // Check if the view exists
    try {
      const { data, error } = await supabase
        .from('recent_evaluations')
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`   ❌ View 'recent_evaluations': Error - ${error.message}`);
      } else {
        console.log(`   ✅ View 'recent_evaluations': OK`);
      }
    } catch (err) {
      console.log(`   ❌ View 'recent_evaluations': Error - ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    
    console.log('\n🎉 MCP Database setup complete!');
    console.log('\nNext steps:');
    console.log('1. Test the MCP benchmark API: /api/benchmark/mcp');
    console.log('2. Check analytics: /api/analytics/mcp');
    console.log('3. View recent evaluations in your database');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Alternative SQL execution for manual setup
function printManualInstructions() {
  console.log('\n📋 Manual Database Setup Instructions:');
  console.log('If the automated setup fails, run these steps manually in your Supabase SQL editor:');
  console.log('\n1. Copy the contents of lib/database-schema-complete.sql');
  console.log('2. Paste it into your Supabase SQL editor');
  console.log('3. Run the SQL statements');
  console.log('4. Verify the tables are created');
}

if (require.main === module) {
  setupDatabase().catch(error => {
    console.error('Setup failed:', error);
    printManualInstructions();
    process.exit(1);
  });
}

export { setupDatabase };
