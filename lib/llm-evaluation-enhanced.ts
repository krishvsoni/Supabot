import { ChatCohere } from "@langchain/cohere";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { createClient } from '@supabase/supabase-js';

export interface EvaluationMetrics {
  model_name: string;
  provider: string;
  response_time_ms: number;
  token_count: number;
  cost_estimate: number;
  quality_score: number;
  helpfulness_score?: number;
  coherence_score?: number;
}

export interface LLMProvider {
  name: string;
  displayName: string;
  model: any;
  costPerToken: number;
  maxTokens: number;
  category: 'fast' | 'balanced' | 'quality';
  description: string;
}

export interface DocumentData {
  id: number;
  file_path: string;
  title: string;
  clean_text: string;
  word_count: number;
  char_count: number;
  path_boost: number;
  category: string;
}

export interface ChatRequest {
  message: string;
  useContext?: boolean;
  selectedProvider?: string;
  userId?: string;
  sessionId?: string;
}

export interface ChatResponse {
  answer: string;
  model: string;
  provider: string;
  responseTime: number;
  context?: string;
  contextDocs?: DocumentData[];
  quality_score?: number;
  token_count?: number;
  cost_estimate?: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export class EnhancedLLMEvaluationService {
  private providers: LLMProvider[] = [];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    if (process.env.NEXT_PUBLIC_GROQ_API_KEY) {
      this.providers.push({
        name: 'groq-llama3-70b',
        displayName: 'Groq LLaMA 3 70B',
        model: new ChatGroq({
          apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
          model: "llama3-70b-8192",
          temperature: 0.1,
        }),
        costPerToken: 0,
        maxTokens: 8192,
        category: 'quality',
        description: 'Large model, best quality responses'
      });

      this.providers.push({
        name: 'groq-llama3-8b',
        displayName: 'Groq LLaMA 3 8B',
        model: new ChatGroq({
          apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
          model: "llama3-8b-8192",
          temperature: 0.1,
        }),
        costPerToken: 0,
        maxTokens: 8192,
        category: 'fast',
        description: 'Ultra-fast responses, good quality'
      });

      this.providers.push({
        name: 'groq-mixtral-8x7b',
        displayName: 'Groq Mixtral 8x7B',
        model: new ChatGroq({
          apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
          model: "mixtral-8x7b-32768",
          temperature: 0.1,
        }),
        costPerToken: 0,
        maxTokens: 32768,
        category: 'balanced',
        description: 'Balanced speed and quality'
      });
    }

    // Cohere - Structured responses (FREE TRIAL)
    if (process.env.NEXT_PUBLIC_COHERE_API_KEY) {
      this.providers.push({
        name: 'cohere-command',
        displayName: 'Cohere Command',
        model: new ChatCohere({
          apiKey: process.env.NEXT_PUBLIC_COHERE_API_KEY,
          model: "command",
          temperature: 0.1,
        }),
        costPerToken: 0,
        maxTokens: 4096,
        category: 'balanced',
        description: 'Great for structured responses'
      });
    }

    if (process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
      this.providers.push({
        name: 'openrouter-openchat',
        displayName: 'OpenChat 7B',
        model: new ChatOpenAI({
          apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
          configuration: {
            baseURL: "https://openrouter.ai/api/v1",
          },
          model: "openchat/openchat-7b:free",
          temperature: 0.1,
        }),
        costPerToken: 0,
        maxTokens: 4096,
        category: 'balanced',
        description: 'Free OpenRouter model'
      });
    }
  }

  getAvailableProviders(): LLMProvider[] {
    return this.providers.map(p => ({
      name: p.name,
      displayName: p.displayName,
      model: null, 
      costPerToken: p.costPerToken,
      maxTokens: p.maxTokens,
      category: p.category,
      description: p.description
    }));
  }

  async getRelevantContext(query: string, limit: number = 5): Promise<DocumentData[]> {
    const dbClient = supabaseAdmin || supabase;
    
    if (!dbClient) {
      console.warn('Supabase not configured');
      return [];
    }

    console.log('🔍 Searching for query:', query, 'using', supabaseAdmin ? 'admin client' : 'anon client');

    try {
      // Test database connection and count
      const { count: totalCount, error: testError } = await dbClient
        .from('documents_text')
        .select('*', { count: 'exact' })
        .limit(1);
        
      console.log('🧪 Database test - Total docs available:', totalCount || 0);
      if (testError) {
        console.error('🚨 Database connection error:', testError);
        return [];
      }

      if (!totalCount || totalCount === 0) {
        console.log('❌ No documents found in database');
        return [];
      }

      // First try vector similarity search if embeddings are available
      let { data: vectorResults, error: vectorError } = await dbClient
        .rpc('match_documents', {
          query_text: query,
          match_threshold: 0.7,
          match_count: limit
        });

      if (vectorError) {
        console.log('Vector search failed, using text search fallback:', vectorError);
      }

      // If vector search fails or returns few results, fallback to direct documents_text search
      if (vectorError || !vectorResults || vectorResults.length < 2) {
        console.log('Using direct documents_text search for query:', query);
        
        // Create broader search terms from the query
        const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
        console.log('Search terms:', searchTerms);
        
        // Try multiple search strategies with improved ranking
        let directResults = null;
        let directError = null;

        // Strategy 1: Look for specific chatbot/pipeline content first
        if (query.toLowerCase().includes('chatbot') || query.toLowerCase().includes('supabot') || query.toLowerCase().includes('built')) {
          console.log('Searching for chatbot-specific content...');
          ({ data: directResults, error: directError } = await dbClient
            .from('documents_text')
            .select('*')
            .or(`file_path.ilike.%chatbot%,file_path.ilike.%supabot%,title.ilike.%chatbot%,title.ilike.%supabot%`)
            .limit(limit));
        }

        // Strategy 2: Search with better ranking (prioritize non-CLI docs)
        if (!directResults || directResults.length === 0) {
          console.log('Searching with improved ranking...');
          ({ data: directResults, error: directError } = await dbClient
            .from('documents_text')
            .select('*')
            .or(`title.ilike.%${query}%,clean_text.ilike.%${query}%`)
            .not('file_path', 'like', '%cli%')  // Exclude CLI docs initially
            .order('word_count', { ascending: false })
            .limit(limit));
        }

        // Strategy 3: Try individual search terms with diversity
        if (!directResults || directResults.length === 0) {
          console.log('Trying individual search terms with diversity...');
          const allResults = [];
          
          for (const term of searchTerms.slice(0, 3)) { // Limit to first 3 terms
            const { data: termResults } = await dbClient
              .from('documents_text')
              .select('*')
              .or(`title.ilike.%${term}%,clean_text.ilike.%${term}%`)
              .not('file_path', 'like', '%cli%')  // Prefer non-CLI docs
              .order('word_count', { ascending: false })
              .limit(3);
            
            if (termResults && termResults.length > 0) {
              allResults.push(...termResults.slice(0, 2)); // Take top 2 per term
              console.log(`Found ${termResults.length} results for term: ${term}`);
            }
          }
          
          // Remove duplicates and take top results
          const uniqueResults = allResults.filter((result, index, self) => 
            index === self.findIndex(r => r.id === result.id)
          );
          directResults = uniqueResults.slice(0, limit);
        }

        // Strategy 4: If still no results, include CLI docs as fallback
        if (!directResults || directResults.length === 0) {
          console.log('Fallback: including CLI documentation...');
          for (const term of searchTerms.slice(0, 2)) {
            ({ data: directResults, error: directError } = await dbClient
              .from('documents_text')
              .select('*')
              .or(`title.ilike.%${term}%,clean_text.ilike.%${term}%`)
              .order('word_count', { ascending: false })
              .limit(limit));
            
            if (directResults && directResults.length > 0) {
              console.log(`Found ${directResults.length} results for term: ${term} (including CLI)`);
              break;
            }
          }
        }

        // Strategy 5: Last resort - get diverse sample documents
        if (!directResults || directResults.length === 0) {
          console.log('Getting diverse sample documents...');
          ({ data: directResults, error: directError } = await dbClient
            .from('documents_text')
            .select('*')
            .not('file_path', 'like', '%cli%')
            .order('word_count', { ascending: false })
            .limit(limit));
        }

        console.log('Direct search results count:', directResults?.length || 0);
        if (directResults && directResults.length > 0) {
          console.log('Sample result:', {
            title: directResults[0].title,
            contentLength: directResults[0].clean_text?.length || 0,
            filePath: directResults[0].file_path
          });
        }

        if (directError) {
          console.error('Direct search error:', directError);
          return [];
        }

        // Transform results to match expected interface
        return (directResults || []).map(doc => ({
          id: doc.id,
          file_path: doc.file_path,
          title: doc.title || 'Untitled',
          clean_text: doc.clean_text || '',
          word_count: doc.word_count || 0,
          char_count: doc.char_count || 0,
          path_boost: 1.0,
          category: this.categorizeDocument(doc.file_path)
        }));
      }

      return vectorResults || [];
    } catch (error) {
      console.error('Error in getRelevantContext:', error);
      
      // Final fallback: simple direct query
      try {
        const { data: fallbackResults, error: fallbackError } = await dbClient
          .from('documents_text')
          .select('*')
          .limit(limit);

        if (fallbackError) {
          console.error('Fallback search error:', fallbackError);
          return [];
        }

        return (fallbackResults || []).map(doc => ({
          id: doc.id,
          file_path: doc.file_path,
          title: doc.title || 'Untitled',
          clean_text: doc.clean_text || '',
          word_count: doc.word_count || 0,
          char_count: doc.char_count || 0,
          path_boost: 1.0,
          category: this.categorizeDocument(doc.file_path)
        }));
      } catch (finalError) {
        console.error('Final fallback error:', finalError);
        return [];
      }
    }
  }

  private categorizeDocument(filePath: string): string {
    if (!filePath) return 'General';
    
    const path = filePath.toLowerCase();
    if (path.includes('auth')) return 'Authentication';
    if (path.includes('database')) return 'Database';
    if (path.includes('storage')) return 'Storage';
    if (path.includes('edge-functions')) return 'Edge Functions';
    if (path.includes('realtime')) return 'Realtime';
    return 'General';
  }

  // Log chat interactions for analytics and evaluation
  async logChatInteraction(request: ChatRequest, response: ChatResponse): Promise<void> {
    const logClient = supabaseAdmin || supabase;
    if (!logClient) return;

    try {
      const { error } = await logClient
        .from('chat_logs')
        .insert({
          user_id: request.userId,
          session_id: request.sessionId,
          question: request.message,
          answer: response.answer,
          model_name: response.model,
          provider: response.provider,
          response_time_ms: response.responseTime,
          token_count: response.token_count || 0,
          cost_estimate: response.cost_estimate || 0,
          quality_score: response.quality_score || 0,
          context_used: request.useContext || false,
          context_docs_count: response.contextDocs?.length || 0,
          context_preview: response.context,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging chat interaction:', error);
      }
    } catch (error) {
      console.error('Error in logChatInteraction:', error);
    }
  }

  // Enhanced chat with provider selection
  async chatWithProvider(request: ChatRequest): Promise<ChatResponse> {
    const { message, useContext = true, selectedProvider } = request;

    console.log('💬 Chat request:', { message, useContext, selectedProvider });

    // Get relevant context if requested
    let contextText = '';
    let contextDocs: DocumentData[] = [];
    
    if (useContext) {
      console.log('🔍 Getting relevant context for message:', message);
      contextDocs = await this.getRelevantContext(message, 5);
      console.log('📄 Found context docs:', contextDocs.length);
      
      if (contextDocs.length > 0) {
        contextText = contextDocs.map(doc => 
          `**${doc.title}** (${doc.category})\n${doc.clean_text.substring(0, 500)}...`
        ).join('\n\n');
        console.log('📝 Context text length:', contextText.length);
        console.log('📄 Context preview:', contextText.substring(0, 200) + '...');
      } else {
        console.log('⚠️ No context documents found');
      }
    }

    const enhancedMessage = contextText 
      ? `Based on this Supabase documentation:\n\n${contextText}\n\nUser Question: ${message}\n\nPlease provide a helpful answer based ONLY on the documentation context above. If the answer is not in the provided documentation, say "I don't have that information in the provided documentation." Be specific and include relevant details from the documentation.`
      : message;

    console.log('📤 Enhanced message length:', enhancedMessage.length);

    // Select provider
    let targetProvider: LLMProvider;
    
    if (selectedProvider) {
      const provider = this.providers.find(p => p.name === selectedProvider);
      if (!provider) {
        throw new Error(`Provider ${selectedProvider} not found`);
      }
      targetProvider = provider;
    } else {
      // Default to best available provider (prefer Groq for speed)
      targetProvider = this.providers.find(p => p.name.includes('groq-llama3-8b')) || this.providers[0];
      if (!targetProvider) {
        throw new Error('No providers available');
      }
    }

    // Execute the chat
    const startTime = Date.now();
    
    try {
      const response = await targetProvider.model.invoke([
        { 
          role: "system", 
          content: "You are a Supabase documentation assistant. You MUST base your answers ONLY on the provided documentation context. If the answer is not in the provided documentation, clearly state that you don't have that information in the documentation. Do not use external knowledge. Format your responses with markdown when appropriate and cite specific sections from the documentation when possible." 
        },
        { role: "user", content: enhancedMessage }
      ]);

      const endTime = Date.now();
      const answer = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const tokenCount = this.estimateTokenCount(answer);
      const qualityScore = await this.calculateQualityScore(message, answer);

      const chatResponse: ChatResponse = {
        answer,
        model: targetProvider.displayName,
        provider: targetProvider.name.split('-')[0],
        responseTime: endTime - startTime,
        context: contextDocs.length > 0 ? `${contextDocs.length} docs found` : undefined,
        contextDocs,
        quality_score: qualityScore,
        token_count: tokenCount,
        cost_estimate: tokenCount * targetProvider.costPerToken
      };

      // Log the interaction
      await this.logChatInteraction(request, chatResponse);

      return chatResponse;

    } catch (error) {
      console.error(`Error with ${targetProvider.name}:`, error);
      throw new Error(`Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get chat analytics and statistics
  async getChatAnalytics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<any> {
    if (!supabase) return null;

    const timeRangeMap = {
      '1h': '1 hour',
      '24h': '24 hours', 
      '7d': '7 days',
      '30d': '30 days'
    };

    try {
      // Get provider statistics
      const { data: providerStats, error: providerError } = await supabase
        .from('chat_logs')
        .select('provider, model_name, response_time_ms, quality_score, context_used')
        .gte('timestamp', `now() - interval '${timeRangeMap[timeRange]}'`);

      if (providerError) throw providerError;

      // Get popular questions
      const { data: popularQuestions, error: questionsError } = await supabase
        .from('chat_logs')
        .select('question')
        .gte('timestamp', `now() - interval '${timeRangeMap[timeRange]}'`)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (questionsError) throw questionsError;

      // Calculate aggregated stats
      const stats = this.calculateProviderStats(providerStats || []);

      return {
        providerStats: stats,
        popularQuestions: popularQuestions?.map(q => q.question) || [],
        totalChats: providerStats?.length || 0,
        timeRange
      };

    } catch (error) {
      console.error('Error getting chat analytics:', error);
      return null;
    }
  }

  private calculateProviderStats(logs: any[]): any[] {
    const grouped = logs.reduce((acc, log) => {
      const key = `${log.provider}-${log.model_name}`;
      if (!acc[key]) {
        acc[key] = {
          provider: log.provider,
          model_name: log.model_name,
          count: 0,
          totalResponseTime: 0,
          totalQualityScore: 0,
          contextUsedCount: 0
        };
      }
      
      acc[key].count++;
      acc[key].totalResponseTime += log.response_time_ms;
      acc[key].totalQualityScore += log.quality_score || 0;
      if (log.context_used) acc[key].contextUsedCount++;
      
      return acc;
    }, {});

    return Object.values(grouped).map((stats: any) => ({
      provider: stats.provider,
      model_name: stats.model_name,
      count: stats.count,
      avgResponseTime: Math.round(stats.totalResponseTime / stats.count),
      avgQualityScore: Number((stats.totalQualityScore / stats.count).toFixed(2)),
      contextUsageRate: Number((stats.contextUsedCount / stats.count * 100).toFixed(1))
    }));
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async calculateQualityScore(question: string, answer: string): Promise<number> {
    // Simple quality scoring based on answer characteristics
    let score = 50; // Base score

    // Length scoring (answers should be substantial but not too long)
    const answerLength = answer.length;
    if (answerLength > 100 && answerLength < 2000) score += 20;
    else if (answerLength > 50) score += 10;

    // Content quality indicators
    if (answer.includes('Supabase')) score += 10;
    if (answer.match(/\b(how|what|when|where|why)\b/gi)) score += 5;
    if (answer.includes('```')) score += 15; // Code examples
    if (answer.match(/\d+\./g)) score += 10; // Numbered lists
    if (answer.match(/\*\s/g)) score += 5; // Bullet points

    // Avoid generic responses
    if (answer.toLowerCase().includes("i don't know") || 
        answer.toLowerCase().includes("i'm not sure")) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Evaluate question across all providers for comparison
  async evaluateQuestionAcrossProviders(question: string, useContext: boolean = true): Promise<any[]> {
    const results = [];
    
    for (const provider of this.providers) {
      try {
        const response = await this.chatWithProvider({
          message: question,
          useContext,
          selectedProvider: provider.name
        });
        
        results.push({
          provider: provider.name,
          displayName: provider.displayName,
          category: provider.category,
          response: response.answer,
          responseTime: response.responseTime,
          qualityScore: response.quality_score,
          tokenCount: response.token_count,
          costEstimate: response.cost_estimate
        });
      } catch (error) {
        results.push({
          provider: provider.name,
          displayName: provider.displayName,
          category: provider.category,
          response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          responseTime: -1,
          qualityScore: 0,
          tokenCount: 0,
          costEstimate: 0
        });
      }
    }
    
    return results;
  }

  // Run comprehensive benchmark with user's question and similar questions
  async runComprehensiveBenchmark(userQuestion: string, useContext: boolean = true): Promise<any> {
    if (!supabase) {
      throw new Error('Supabase not configured for benchmarking');
    }

    try {
      // Create benchmark session
      const { data: sessionData, error: sessionError } = await supabase
        .from('benchmark_sessions')
        .insert({
          session_name: `Benchmark: ${userQuestion.substring(0, 50)}...`,
          description: `Comprehensive benchmark starting with user question: ${userQuestion}`,
          question_count: 0,
          provider_count: this.providers.length,
          status: 'running'
        })
        .select()
        .single();

      if (sessionError) {
        throw new Error(`Failed to create benchmark session: ${sessionError.message}`);
      }

      const sessionId = sessionData.id;
      const questions = [userQuestion, ...this.generateSimilarQuestions(userQuestion)];
      const allResults = [];

      // Update session with actual question count
      await supabase
        .from('benchmark_sessions')
        .update({ question_count: questions.length })
        .eq('id', sessionId);

      // Evaluate each question across all providers
      for (const question of questions) {
        const questionResults = await this.evaluateQuestionAcrossProviders(question, useContext);
        
        // Store results in llm_evaluations table
        for (const result of questionResults) {
          const { error: evalError } = await supabase
            .from('llm_evaluations')
            .insert({
              session_id: sessionId,
              question: question,
              answer: result.response,
              model_name: result.displayName,
              provider: result.provider,
              response_time_ms: result.responseTime,
              token_count: result.tokenCount,
              cost_estimate: result.costEstimate,
              quality_score: result.qualityScore,
              helpfulness_score: this.calculateHelpfulness(question, result.response),
              coherence_score: this.calculateCoherence(result.response),
              factual_accuracy: this.calculateFactualAccuracy(result.response)
            });

          if (evalError) {
            console.error('Error storing evaluation:', evalError);
          }
        }

        allResults.push({
          question,
          results: questionResults
        });
      }

      // Mark session as completed
      await supabase
        .from('benchmark_sessions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      // Update provider stats
      await this.updateProviderStats(allResults);

      return {
        sessionId,
        questions: allResults,
        summary: this.generateBenchmarkSummary(allResults)
      };

    } catch (error) {
      console.error('Benchmark error:', error);
      throw error;
    }
  }

  private generateSimilarQuestions(userQuestion: string): string[] {
    // Generate similar questions based on the user's question
    const baseQuestions = [
      "How do I get started with Supabase?",
      "What are the best practices for database design in Supabase?",
      "How do I implement authentication?",
      "How do I set up real-time subscriptions?",
      "What is row level security?",
      "How do I use Supabase with Next.js?",
      "How do I store files in Supabase Storage?",
      "What are Edge Functions in Supabase?",
      "How do I migrate my database?",
      "How do I optimize query performance?"
    ];

    // Add variations of the user's question
    const variations = [
      `What is the best way to ${userQuestion.toLowerCase().replace(/[?]/g, '')}?`,
      `Can you explain ${userQuestion.toLowerCase().replace(/[?]/g, '')}?`,
      `Show me how to ${userQuestion.toLowerCase().replace(/[?]/g, '')}`
    ];

    return [...baseQuestions.slice(0, 3), ...variations.slice(0, 2)];
  }

  private calculateHelpfulness(question: string, answer: string): number {
    let score = 50;
    
    // Check if answer addresses the question
    const questionWords = question.toLowerCase().split(' ').filter(w => w.length > 3);
    const answerLower = answer.toLowerCase();
    
    const relevantWords = questionWords.filter(word => answerLower.includes(word));
    score += (relevantWords.length / questionWords.length) * 30;
    
    // Check for actionable content
    if (answer.includes('step') || answer.match(/\d+\./)) score += 10;
    if (answer.includes('example') || answer.includes('```')) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateCoherence(answer: string): number {
    let score = 50;
    
    // Check sentence structure
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 2 && sentences.length <= 10) score += 20;
    
    // Check for logical flow indicators
    const flowWords = ['first', 'then', 'next', 'finally', 'however', 'therefore'];
    const hasFlow = flowWords.some(word => answer.toLowerCase().includes(word));
    if (hasFlow) score += 15;
    
    // Check for proper formatting
    if (answer.includes('\n') || answer.includes('*')) score += 15;
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateFactualAccuracy(answer: string): number {
    let score = 50;
    
    // Check for Supabase-specific terms (indicates domain knowledge)
    const supabaseTerms = ['supabase', 'postgresql', 'row level security', 'realtime', 'edge functions'];
    const termCount = supabaseTerms.filter(term => answer.toLowerCase().includes(term)).length;
    score += termCount * 10;
    
    // Penalize for uncertain language
    const uncertainPhrases = ['i think', 'maybe', 'not sure', "i don't know"];
    const uncertainCount = uncertainPhrases.filter(phrase => answer.toLowerCase().includes(phrase)).length;
    score -= uncertainCount * 15;
    
    return Math.min(100, Math.max(0, score));
  }

  private async updateProviderStats(benchmarkResults: any[]): Promise<void> {
    if (!supabase) return;

    const stats: { [key: string]: any } = {};

    // Aggregate stats from all results
    for (const questionResult of benchmarkResults) {
      for (const result of questionResult.results) {
        const key = `${result.provider}-${result.displayName}`;
        
        if (!stats[key]) {
          stats[key] = {
            provider: result.provider,
            model_name: result.displayName,
            total_requests: 0,
            total_response_time_ms: 0,
            total_quality_score: 0,
            total_cost: 0
          };
        }
        
        stats[key].total_requests += 1;
        stats[key].total_response_time_ms += result.responseTime;
        stats[key].total_quality_score += result.qualityScore;
        stats[key].total_cost += result.costEstimate;
      }
    }

    // Upsert stats
    for (const statKey of Object.keys(stats)) {
      const stat = stats[statKey];
      const avgQualityScore = stat.total_quality_score / stat.total_requests;

      await supabase
        .from('llm_provider_stats')
        .upsert({
          provider: stat.provider,
          model_name: stat.model_name,
          total_requests: stat.total_requests,
          total_response_time_ms: stat.total_response_time_ms,
          avg_quality_score: avgQualityScore,
          total_cost: stat.total_cost,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'provider,model_name'
        });
    }
  }

  private generateBenchmarkSummary(results: any[]): any {
    const allResults = results.flatMap(r => r.results);
    
    const summary = {
      totalQuestions: results.length,
      totalEvaluations: allResults.length,
      avgResponseTime: allResults.reduce((sum, r) => sum + r.responseTime, 0) / allResults.length,
      avgQualityScore: allResults.reduce((sum, r) => sum + r.qualityScore, 0) / allResults.length,
      totalCost: allResults.reduce((sum, r) => sum + r.costEstimate, 0),
      providerPerformance: this.calculateProviderPerformance(allResults)
    };

    return summary;
  }

  private calculateProviderPerformance(results: any[]): any[] {
    const grouped = results.reduce((acc, result) => {
      const key = result.provider;
      if (!acc[key]) {
        acc[key] = {
          provider: result.provider,
          count: 0,
          totalResponseTime: 0,
          totalQualityScore: 0,
          totalCost: 0
        };
      }
      
      acc[key].count++;
      acc[key].totalResponseTime += result.responseTime;
      acc[key].totalQualityScore += result.qualityScore;
      acc[key].totalCost += result.costEstimate;
      
      return acc;
    }, {});

    return Object.values(grouped).map((stats: any) => ({
      provider: stats.provider,
      avgResponseTime: Math.round(stats.totalResponseTime / stats.count),
      avgQualityScore: Number((stats.totalQualityScore / stats.count).toFixed(2)),
      totalCost: Number(stats.totalCost.toFixed(6)),
      evaluationCount: stats.count
    }));
  }

  async getDetailedAnalytics(timeRange: '1h' | '24h' | '7d' | '30d' | 'all' = '24h'): Promise<any> {
    if (!supabase) {
      // Return mock data for development
      return this.getMockDetailedAnalytics();
    }

    const timeRangeMap = {
      '1h': '1 hour',
      '24h': '24 hours', 
      '7d': '7 days',
      '30d': '30 days',
      'all': '100 years' // Effectively all data
    };

    try {
      // Get detailed model statistics from the chat_analytics_view
      const query = supabase
        .from('chat_analytics_view')
        .select('*');

      if (timeRange !== 'all') {
        query.gte('last_chat', `now() - interval '${timeRangeMap[timeRange]}'`);
      }

      const { data: modelStats, error: modelError } = await query;

      if (modelError) throw modelError;

      // Get popular questions with counts
      const { data: popularQuestions, error: questionsError } = await supabase
        .rpc('get_popular_questions', { 
          time_range: timeRange === 'all' ? null : timeRangeMap[timeRange],
          limit_count: 10 
        });

      if (questionsError) {
        console.warn('Error getting popular questions:', questionsError);
      }

      // Get question performance metrics
      const { data: questionPerformance, error: performanceError } = await this.getQuestionPerformanceMetrics(timeRange);
      
      if (performanceError) {
        console.warn('Error getting question performance:', performanceError);
      }

      // Get precision metrics
      const { data: precisionMetrics, error: precisionError } = await this.getPrecisionMetrics(timeRange);
      
      if (precisionError) {
        console.warn('Error getting precision metrics:', precisionError);
      }

      // Calculate totals
      const totalChats = modelStats?.reduce((sum, model) => sum + model.total_chats, 0) || 0;
      const totalCost = modelStats?.reduce((sum, model) => sum + (model.cost_estimate_total || 0), 0) || 0;
      const avgResponseTime = modelStats?.length > 0 
        ? modelStats.reduce((sum, model) => sum + model.avg_response_time, 0) / modelStats.length 
        : 0;
      const avgQualityScore = modelStats?.length > 0
        ? modelStats.reduce((sum, model) => sum + model.avg_quality_score, 0) / modelStats.length
        : 0;

      return {
        modelStats: modelStats || [],
        popularQuestions: popularQuestions || [],
        questionPerformance: questionPerformance || [],
        precisionMetrics: precisionMetrics || this.getMockPrecisionMetrics(),
        totalChats,
        totalCost,
        avgResponseTime,
        avgQualityScore,
        timeRange
      };

    } catch (error) {
      console.error('Error getting detailed analytics:', error);
      return this.getMockDetailedAnalytics();
    }
  }

  private async getQuestionPerformanceMetrics(timeRange: string): Promise<{ data: any[], error: any }> {
    if (!supabase) {
      return { data: this.getMockQuestionPerformance(), error: null };
    }

    try {
      const timeRangeMap = {
        '1h': '1 hour',
        '24h': '24 hours', 
        '7d': '7 days',
        '30d': '30 days',
        'all': '100 years'
      };

      const timeFilter = timeRange === 'all' ? '' : `AND timestamp >= NOW() - INTERVAL '${timeRangeMap[timeRange as keyof typeof timeRangeMap]}'`;

      // Get question performance data using raw SQL for better aggregation
      const { data, error } = await supabase.rpc('get_question_performance', {
        time_filter: timeFilter,
        limit_count: 20
      });

      if (error) {
        console.error('Question performance query error:', error);
        return { data: this.getMockQuestionPerformance(), error };
      }

      return { data: data || this.getMockQuestionPerformance(), error: null };
    } catch (error) {
      return { data: this.getMockQuestionPerformance(), error };
    }
  }

  private async getPrecisionMetrics(timeRange: string): Promise<{ data: any, error: any }> {
    if (!supabase) {
      return { data: this.getMockPrecisionMetrics(), error: null };
    }

    try {
      // Calculate precision metrics based on context usage and quality scores
      const timeRangeMap = {
        '1h': '1 hour',
        '24h': '24 hours', 
        '7d': '7 days',
        '30d': '30 days',
        'all': '100 years'
      };

      const timeCondition = timeRange === 'all' 
        ? '' 
        : `WHERE timestamp >= NOW() - INTERVAL '${timeRangeMap[timeRange as keyof typeof timeRangeMap]}'`;

      // Get precision data by category (based on context docs)
      const { data: categoryStats, error } = await supabase
        .from('chat_logs')
        .select('*')
        .gte('timestamp', timeRange === 'all' ? '1900-01-01' : `now() - interval '${timeRangeMap[timeRange as keyof typeof timeRangeMap]}'`);

      if (error) {
        return { data: this.getMockPrecisionMetrics(), error };
      }

      // Calculate precision metrics
      const precisionMetrics = this.calculatePrecisionFromData(categoryStats || []);
      
      return { data: precisionMetrics, error: null };
    } catch (error) {
      return { data: this.getMockPrecisionMetrics(), error };
    }
  }

  private calculatePrecisionFromData(chatLogs: any[]): any {
    // Group by context docs count as a proxy for categories
    const categories = {
      'No Context': chatLogs.filter(log => !log.context_used || log.context_docs_count === 0),
      'Low Context (1-2 docs)': chatLogs.filter(log => log.context_used && log.context_docs_count <= 2),
      'Medium Context (3-4 docs)': chatLogs.filter(log => log.context_used && log.context_docs_count <= 4 && log.context_docs_count > 2),
      'High Context (5+ docs)': chatLogs.filter(log => log.context_used && log.context_docs_count > 4)
    };

    const byCategory = Object.entries(categories).map(([category, logs]) => {
      const count = logs.length;
      if (count === 0) {
        return { category, precision: 0, recall: 0, f1: 0, count: 0 };
      }

      // Calculate precision based on quality scores (high quality = high precision)
      const highQualityLogs = logs.filter(log => log.quality_score >= 80);
      const precision = (highQualityLogs.length / count) * 100;

      // Calculate recall (assume context usage indicates better recall)
      const contextLogs = logs.filter(log => log.context_used);
      const recall = (contextLogs.length / count) * 100;

      // Calculate F1 score
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      return {
        category,
        precision: Number(precision.toFixed(1)),
        recall: Number(recall.toFixed(1)),
        f1: Number(f1.toFixed(1)),
        count
      };
    });

    const totalPrecision = byCategory.reduce((sum, cat) => sum + cat.precision * cat.count, 0);
    const totalCount = byCategory.reduce((sum, cat) => sum + cat.count, 0);
    const averagePrecision = totalCount > 0 ? totalPrecision / totalCount : 0;

    return {
      byCategory,
      averagePrecision: Number(averagePrecision.toFixed(1))
    };
  }

  private getMockQuestionPerformance(): any[] {
    return [
      {
        question: 'How do I set up authentication in Supabase?',
        avgQualityScore: 87.5,
        avgResponseTime: 645,
        count: 15,
        contextUsageRate: 93.3,
        providerDistribution: { groq: 8, cohere: 4, openrouter: 3 }
      },
      {
        question: 'What are the best practices for database design?',
        avgQualityScore: 82.1,
        avgResponseTime: 890,
        count: 12,
        contextUsageRate: 83.3,
        providerDistribution: { groq: 6, cohere: 3, openrouter: 3 }
      },
      {
        question: 'How do I implement real-time subscriptions?',
        avgQualityScore: 79.8,
        avgResponseTime: 756,
        count: 10,
        contextUsageRate: 90.0,
        providerDistribution: { groq: 5, cohere: 3, openrouter: 2 }
      }
    ];
  }

  private getMockPrecisionMetrics(): any {
    return {
      byCategory: [
        { category: 'Authentication', precision: 89.2, recall: 85.7, f1: 87.4, count: 45 },
        { category: 'Database', precision: 84.6, recall: 88.9, f1: 86.7, count: 38 },
        { category: 'Storage', precision: 76.3, recall: 82.1, f1: 79.1, count: 23 },
        { category: 'Realtime', precision: 81.5, recall: 79.3, f1: 80.4, count: 18 },
        { category: 'General', precision: 73.2, recall: 76.8, f1: 74.9, count: 52 }
      ],
      averagePrecision: 82.1
    };
  }

  private getMockDetailedAnalytics(): any {
    return {
      modelStats: [
        {
          provider: 'groq',
          model_name: 'llama3-8b-8192',
          total_chats: 145,
          avg_response_time: 280,
          avg_quality_score: 78,
          avg_token_count: 156,
          context_usage_rate: 85,
          avg_context_docs: 3.2,
          first_chat: '2024-01-01T00:00:00Z',
          last_chat: new Date().toISOString(),
          cost_estimate_total: 0
        },
        {
          provider: 'cohere',
          model_name: 'command',
          total_chats: 89,
          avg_response_time: 450,
          avg_quality_score: 85,
          avg_token_count: 198,
          context_usage_rate: 78,
          avg_context_docs: 2.8,
          first_chat: '2024-01-01T00:00:00Z',
          last_chat: new Date().toISOString(),
          cost_estimate_total: 0.025
        },
        {
          provider: 'openrouter',
          model_name: 'meta-llama/llama-3.1-70b-instruct',
          total_chats: 67,
          avg_response_time: 680,
          avg_quality_score: 92,
          avg_token_count: 234,
          context_usage_rate: 72,
          avg_context_docs: 3.5,
          first_chat: '2024-01-01T00:00:00Z',
          last_chat: new Date().toISOString(),
          cost_estimate_total: 0.078
        }
      ],
      popularQuestions: [
        { question: 'How do I set up authentication in Supabase?', count: 23 },
        { question: 'What are the best practices for database design?', count: 18 },
        { question: 'How do I implement real-time subscriptions?', count: 15 },
        { question: 'Explain row level security policies', count: 12 },
        { question: 'How to use Supabase with Next.js?', count: 10 }
      ],
      totalChats: 301,
      totalCost: 0.103,
      avgResponseTime: 470,
      avgQualityScore: 85,
      timeRange: '24h'
    };
  }
}
