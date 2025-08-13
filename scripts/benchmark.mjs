#!/usr/bin/env node
import { config } from 'dotenv';

config();

async function main() {
  const args = process.argv.slice(2);
  const questionCount = parseInt(args[0]) || 10;
  
  console.log('Starting LLM Benchmark Evaluation');
  console.log(`Question Count: ${questionCount}`);
  console.log('Available Providers:');
  
  // Check environment variables
  const providers = [];
  if (process.env.NEXT_PUBLIC_GROQ_API_KEY) {
    providers.push(' Groq (Mixtral-8x7B, LLaMA3-70B)');
  } else {
    providers.push(' Groq (API key missing)');
  }
  
  if (process.env.NEXT_PUBLIC_COHERE_API_KEY) {
    providers.push(' Cohere (Command)');
  } else {
    providers.push(' Cohere (API key missing)');
  }
  
  if (process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
    providers.push('OpenRouter (OpenChat-7B, MythoMax-L2-13B)');
  } else {
    providers.push('OpenRouter (API key missing)');
  }
  
  providers.forEach(provider => console.log(`   ${provider}`));
  console.log('');
  
  console.log('Running benchmark via API...');
  
  try {
    // Use fetch to call the API since we're in a script context
    const response = await fetch(`http://localhost:3000/api/benchmark?count=${questionCount}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('\nBenchmark Results:');
      console.log(`   Total Evaluations: ${data.totalEvaluations}`);
      console.log('\nBenchmark completed successfully!');
      console.log('Results stored in Supabase database');
      console.log('View detailed results in the dashboard at /dashboard');
    } else {
      throw new Error(data.error || 'Benchmark failed');
    }
    
  } catch (error) {
    console.error('Benchmark failed:', error.message);
    console.log('\nMake sure the development server is running:');
    console.log('   npm run dev');
    console.log('\n   Then try the benchmark again.');
    process.exit(1);
  }
}

main();

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
LLM Benchmark CLI

Usage:
  npm run benchmark [question_count]
  
Arguments:
  question_count    Number of questions to evaluate (default: 10)
  
Examples:
  npm run benchmark 5       # Quick test with 5 questions
  npm run benchmark 20      # Standard test with 20 questions
  npm run benchmark 50      # Comprehensive test with 50 questions
  
Environment Variables Required:
  NEXT_PUBLIC_GROQ_API_KEY              # Groq API key (free)
  NEXT_PUBLIC_TOGETHER_AI_API           # Together AI API key (free tier)
  NEXT_PUBLIC_COHERE_API_KEY            # Cohere API key (free trial)
  NEXT_PUBLIC_OPENROUTER_API_KEY        # OpenRouter API key (free models)
  NEXT_PUBLIC_SUPABASE_ANON_KEY         # Supabase anon key
  NEXT_PUBLIC_DATABASE_URL              # Supabase database URL
  `);
  process.exit(0);
}

main().catch(console.error);
