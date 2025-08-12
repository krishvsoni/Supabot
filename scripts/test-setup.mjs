#!/usr/bin/env node
/**
 * Test script to verify LLM evaluation setup
 */

import { config } from 'dotenv';

// Load environment variables from .env file
config();

console.log('🔍 Testing LLM Evaluation Setup...\n');

// Test environment variables
console.log('📋 Environment Variables:');
const requiredEnvVars = [
  'NEXT_PUBLIC_GROQ_API_KEY',
  'NEXT_PUBLIC_TOGETHER_AI_API',
  'NEXT_PUBLIC_COHERE_API_KEY',
  'NEXT_PUBLIC_OPENROUTER_API_KEY',
  'NEXT_PUBLIC_DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

let missingVars = 0;
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('your_') || value.includes('_here')) {
    console.log(`   ❌ ${varName} - Missing or placeholder`);
    missingVars++;
  } else {
    console.log(`   ✅ ${varName} - Configured`);
  }
});

console.log('\n🔗 Available LLM Providers:');

// Test Groq
if (process.env.NEXT_PUBLIC_GROQ_API_KEY && !process.env.NEXT_PUBLIC_GROQ_API_KEY.includes('your_')) {
  console.log('   ✅ Groq - Mixtral-8x7B, LLaMA3-70B (Fast inference)');
} else {
  console.log('   ❌ Groq - Get free API key at https://console.groq.com');
}

// Test Together AI
if (process.env.NEXT_PUBLIC_TOGETHER_AI_API) {
  console.log('   ✅ Together AI - Mistral-7B, LLaMA2-70B (Rich model selection)');
} else {
  console.log('   ❌ Together AI - Get free API key at https://together.ai');
}

// Test Cohere
if (process.env.NEXT_PUBLIC_COHERE_API_KEY) {
  console.log('   ✅ Cohere - Command (Structured responses)');
} else {
  console.log('   ❌ Cohere - Get free trial at https://cohere.com');
}

// Test OpenRouter
if (process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
  console.log('   ✅ OpenRouter - Free models (OpenChat-7B, MythoMax-L2-13B)');
} else {
  console.log('   ❌ OpenRouter - Get free API key at https://openrouter.ai');
}

console.log('\n📊 Database Connection:');
if (process.env.NEXT_PUBLIC_DATABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your_')) {
    console.log('   ✅ Supabase - Database connection configured');
  } else {
    console.log('   ❌ Supabase - Anon key is placeholder');
  }
} else {
  console.log('   ❌ Supabase - Database URL or anon key missing');
}

console.log('\n🛠️  Setup Status:');
if (missingVars === 0) {
  console.log('   ✅ All environment variables configured');
  console.log('   🚀 Ready to run benchmarks!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Run: npm run benchmark:quick (5 questions)');
  console.log('   2. Run: npm run dev (start dashboard)');
  console.log('   3. Visit: http://localhost:3000/dashboard');
} else {
  console.log(`   ⚠️  ${missingVars} environment variable(s) need configuration`);
  console.log('\n🔧 Setup Instructions:');
  console.log('   1. Copy .env file and add missing API keys');
  console.log('   2. Run this test again: node scripts/test-setup.mjs');
  console.log('   3. Create database tables: Run SQL in lib/database-schema.sql');
}

console.log('\n📚 API Key Sources:');
console.log('   • Groq: https://console.groq.com (Free, fast inference)');
console.log('   • Together AI: https://together.ai (Free tier available)');
console.log('   • Cohere: https://cohere.com (Free trial, 1k calls/month)');
console.log('   • OpenRouter: https://openrouter.ai (Free models available)');

console.log('\n🏗️  Project Structure:');
console.log('   • lib/llm-evaluation.ts - Core evaluation service');
console.log('   • app/api/benchmark/route.ts - Benchmark API endpoint');
console.log('   • app/api/evaluate/route.ts - Single question evaluation');
console.log('   • app/api/chat/route.ts - Smart chat with best model');
console.log('   • components/EvaluationDashboard.tsx - React dashboard');
console.log('   • lib/database-schema.sql - Database setup');

console.log('\n✨ Features:');
console.log('   🔥 Multi-LLM evaluation across 4 free providers');
console.log('   📊 Real-time performance metrics (speed, quality, cost)');
console.log('   💾 Results stored in Supabase for analysis');
console.log('   🤖 Smart chat using best performing model');
console.log('   📈 Interactive dashboard with comparison charts');
console.log('   ⚡ CLI tools for batch evaluation');
