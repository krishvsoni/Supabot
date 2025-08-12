#!/usr/bin/env node

// Database migration script for enhanced features
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

console.log('🗄️  Enhanced Database Migration Script\n');

// Get database configuration
const databaseUrl = process.env.NEXT_PUBLIC_DATABASE_URL || '';
const projectId = databaseUrl.match(/postgres\.([^:]+)/)?.[1] || '';
const supabaseUrl = projectId ? `https://${projectId}.supabase.co` : '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Database configuration missing');
  console.log('   Please configure NEXT_PUBLIC_DATABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('📋 Checking current database state...');
  
  // Check if semantic_search_view exists
  try {
    const { data, error } = await supabase
      .from('semantic_search_view')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('   ⚠️  semantic_search_view not found - needs creation');
    } else {
      console.log('   ✅ semantic_search_view exists');
    }
  } catch (error) {
    console.log('   ⚠️  Could not check semantic_search_view');
  }
  
  // Check if chat_logs table exists
  try {
    const { data, error } = await supabase
      .from('chat_logs')
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('   ⚠️  chat_logs table not found - needs creation');
    } else {
      console.log('   ✅ chat_logs table exists');
    }
  } catch (error) {
    console.log('   ⚠️  Could not check chat_logs table');
  }
  
  console.log('\n🔧 Database Migration Instructions:');
  console.log('   1. Open your Supabase dashboard');
  console.log('   2. Go to SQL Editor');
  console.log('   3. Run the SQL from: lib/enhanced-database-schema.sql');
  console.log('   4. This will create:');
  console.log('      - semantic_search_view (enhanced document search)');
  console.log('      - chat_logs table (conversation tracking)');
  console.log('      - match_documents function (vector search)');
  console.log('      - Analytics views and indexes');
  console.log('      - Proper RLS policies');
  
  console.log('\n📊 Optional: Vector Extension');
  console.log('   For optimal semantic search, enable vector extension:');
  console.log('   CREATE EXTENSION IF NOT EXISTS vector;');
  
  console.log('\n🔍 Test Database Connection:');
  
  // Test basic connection
  try {
    const { data, error } = await supabase
      .from('documents_text')
      .select('id, title')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Connection test failed: ${error.message}`);
    } else {
      console.log(`   ✅ Database connection successful`);
      if (data && data.length > 0) {
        console.log(`   📚 Found documents in database`);
      } else {
        console.log('   ⚠️  No documents found - you may need to run the embedding process');
      }
    }
  } catch (error) {
    console.log(`   ❌ Connection error: ${error.message}`);
  }
  
  console.log('\n🚀 After Migration:');
  console.log('   - Enhanced semantic search will be available');
  console.log('   - Chat logging and analytics will work');
  console.log('   - Multi-provider support will be fully functional');
  console.log('   - Quality scoring and performance tracking enabled');
  
  console.log('\n📝 Verify Migration:');
  console.log('   Run: npm run test-enhanced');
}

runMigration().catch(console.error);
