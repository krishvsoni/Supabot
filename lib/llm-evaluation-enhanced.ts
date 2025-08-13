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

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

    // OpenRouter - Free models
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

  // Get available providers for UI selection
  getAvailableProviders(): LLMProvider[] {
    return this.providers.map(p => ({
      name: p.name,
      displayName: p.displayName,
      model: null, // Don't expose model instance
      costPerToken: p.costPerToken,
      maxTokens: p.maxTokens,
      category: p.category,
      description: p.description
    }));
  }

  async getRelevantContext(query: string, limit: number = 5): Promise<DocumentData[]> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return [];
    }

    try {
      // First try vector similarity search if embeddings are available
      let { data: vectorResults, error: vectorError } = await supabase
        .rpc('match_documents', {
          query_text: query,
          match_threshold: 0.7,
          match_count: limit
        });

      // If vector search fails or returns few results, fallback to text search
      if (vectorError || !vectorResults || vectorResults.length < 2) {
        console.log('Using text search fallback');
        
        const { data: textResults, error: textError } = await supabase
          .from('semantic_search_view')
          .select('*')
          .textSearch('clean_text', query, {
            type: 'websearch',
            config: 'english'
          })
          .order('path_boost', { ascending: false })
          .limit(limit);

        if (textError) {
          console.error('Text search error:', textError);
          // Final fallback to simple ILIKE search
          const { data: simpleResults, error: simpleError } = await supabase
            .from('semantic_search_view')
            .select('*')
            .ilike('clean_text', `%${query}%`)
            .order('word_count', { ascending: false })
            .limit(limit);

          if (simpleError) {
            console.error('Simple search error:', simpleError);
            return [];
          }

          return simpleResults || [];
        }

        return textResults || [];
      }

      return vectorResults || [];
    } catch (error) {
      console.error('Error in getRelevantContext:', error);
      return [];
    }
  }

  // Log chat interactions for analytics and evaluation
  async logChatInteraction(request: ChatRequest, response: ChatResponse): Promise<void> {
    if (!supabase) return;

    try {
      const { error } = await supabase
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

    // Get relevant context if requested
    let contextText = '';
    let contextDocs: DocumentData[] = [];
    
    if (useContext) {
      contextDocs = await this.getRelevantContext(message, 5);
      if (contextDocs.length > 0) {
        contextText = contextDocs.map(doc => 
          `**${doc.title}** (${doc.category})\n${doc.clean_text.substring(0, 400)}...`
        ).join('\n\n');
      }
    }

    const enhancedMessage = contextText 
      ? `Based on this Supabase documentation:\n\n${contextText}\n\nUser Question: ${message}\n\nPlease provide a helpful answer based on the documentation context. Be specific and include relevant details.`
      : message;

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
          content: "You are a helpful Supabase documentation assistant. Provide clear, accurate, and detailed answers based on the provided context. Format your responses nicely with markdown when appropriate." 
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
