#!/usr/bin/env node

// Enhanced system test script for the Supabase AI Docs chatbot
import { EnhancedLLMEvaluationService } from '../lib/llm-evaluation-enhanced.js';

console.log('Enhanced Supabase AI Docs - System Test\n');

async function testEnhancedSystem() {
  const service = new EnhancedLLMEvaluationService();
  
  console.log('1. Testing Provider Configuration...');
  const providers = service.getAvailableProviders();
  console.log(`   Found ${providers.length} providers:`);
  providers.forEach(p => {
    console.log(`      - ${p.displayName} (${p.category}): ${p.description}`);
  });
  
  console.log('\n2. Testing Semantic Search...');
  try {
    const docs = await service.getRelevantContext('authentication setup', 3);
    console.log(`   Retrieved ${docs.length} relevant documents`);
    docs.forEach((doc, i) => {
      console.log(`      ${i+1}. ${doc.title} (${doc.category}) - ${doc.word_count} words`);
    });
  } catch (error) {
    console.log(`   Semantic search error: ${error.message}`);
    console.log('      This is expected if database is not yet configured');
  }
  
  console.log('\n3. Testing Chat Functionality...');
  try {
    const response = await service.chatWithProvider({
      message: 'What is Supabase?',
      useContext: false,
      sessionId: 'test-session'
    });
    console.log(`   Chat response received:`);
    console.log(`      Model: ${response.model}`);
    console.log(`      Response time: ${response.responseTime}ms`);
    console.log(`      Quality score: ${response.quality_score}%`);
    console.log(`      Answer: ${response.answer.substring(0, 100)}...`);
  } catch (error) {
    console.log(`   Chat test failed: ${error.message}`);
  }
  
  console.log('\n4. Testing Analytics...');
  try {
    const analytics = await service.getChatAnalytics('24h');
    if (analytics) {
      console.log(`   Analytics retrieved:`);
      console.log(`      Total chats: ${analytics.totalChats}`);
      console.log(`      Provider stats: ${analytics.providerStats.length} entries`);
    } else {
      console.log('   No analytics data (expected for new setup)');
    }
  } catch (error) {
    console.log(`   Analytics error: ${error.message}`);
  }
  
  console.log('\nEnhanced Features Available:');
  console.log('   Multi-provider LLM support');
  console.log('   Enhanced semantic search');
  console.log('   Comprehensive analytics');
  console.log('   Chat logging and quality scoring');
  console.log('   Provider selection and comparison');
  
  console.log('\nNext Steps:');
  console.log('   1. Ensure database schema is applied');
  console.log('   2. Configure environment variables');
  console.log('   3. Test the enhanced chatbot at /dashboard');
  console.log('   4. Monitor analytics and performance');
  
  console.log('\nAccess Points:');
  console.log('   - Dashboard: http://localhost:3000/dashboard');
  console.log('   - Chat API: http://localhost:3000/api/chat');
  console.log('   - Providers API: http://localhost:3000/api/chat/providers');
  console.log('   - Analytics API: http://localhost:3000/api/analytics');
}

// Run the test
testEnhancedSystem().catch(console.error);
