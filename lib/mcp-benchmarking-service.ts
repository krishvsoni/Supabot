/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import { MCPClient, MCPRequest, MCPResponse } from './mcp-client';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export interface BenchmarkRequest {
  question: string;
  useContext?: boolean;
  sessionName?: string;
  description?: string;
  userId?: string;
}

export interface BenchmarkResult {
  sessionId: number;
  summary: BenchmarkSummary;
  results: ProviderResult[];
  mcpRequestId: string;
}

export interface ProviderResult {
  provider: string;
  model: string;
  response: string;
  responseTime: number;
  tokenCount: number;
  costEstimate: number;
  qualityScore: number;
  coherenceScore: number;
  helpfulnessScore: number;
  error?: string;
}

export interface BenchmarkSummary {
  totalProviders: number;
  avgResponseTime: number;
  avgQualityScore: number;
  totalCost: number;
  bestPerformer: string;
  fastestProvider: string;
}

export interface AnalyticsData {
  providerStats: ProviderStats[];
  sessionHistory: SessionSummary[];
  costAnalysis: CostAnalysis;
  qualityMetrics: QualityMetrics;
}

export interface ProviderStats {
  provider: string;
  modelName: string;
  totalRequests: number;
  avgResponseTime: number;
  avgQualityScore: number;
  successRate: number;
  totalCost: number;
  lastUpdated: string;
}

export interface SessionSummary {
  sessionId: number;
  sessionName: string;
  questionCount: number;
  providerCount: number;
  avgQualityScore: number;
  totalCost: number;
  completedAt: string;
}

export interface CostAnalysis {
  totalCost: number;
  costByProvider: { provider: string; cost: number }[];
  avgCostPerRequest: number;
  projectedMonthlyCost: number;
}

export interface QualityMetrics {
  overallQualityScore: number;
  qualityByCategory: { category: string; score: number }[];
  improvementSuggestions: string[];
}

export class MCPBenchmarkingService {
  private mcpClient: MCPClient;
  private dbClient: any;

  constructor() {
    this.mcpClient = new MCPClient();
    this.dbClient = supabaseAdmin || supabase;
  }

  async runSingleQuestionBenchmark(request: BenchmarkRequest): Promise<BenchmarkResult> {
    if (!this.dbClient) {
      throw new Error('Database not configured');
    }

    const sessionName = request.sessionName || 'Single Question: ' + request.question.substring(0, 50) + '...';
    const description = request.description || 'Single question benchmark: ' + request.question;
    
    const { data: sessionData, error: sessionError } = await this.dbClient
      .from('benchmark_sessions')
      .insert({
        session_name: sessionName,
        description: description,
        question_count: 1,
        provider_count: this.mcpClient.getAvailableServers().length,
        status: 'running'
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error('Failed to create benchmark session: ' + sessionError.message);
    }

    const sessionId = sessionData.id;
    const mcpRequestId = generateUUID();

    try {
      let context = '';
      if (request.useContext) {
        context = await this.getRelevantContext(request.question);
      }

      const mcpRequest: MCPRequest = {
        id: mcpRequestId,
        message: request.question,
        context,
        parameters: {
          temperature: 0.1,
          useContext: request.useContext
        },
        metadata: {
          userId: request.userId,
          sessionId: sessionId.toString(),
          timestamp: new Date().toISOString()
        }
      };

      await this.storeMCPRequest(mcpRequest, sessionId);
      const mcpResponses = await this.mcpClient.broadcastRequest(mcpRequest);

      const results: ProviderResult[] = [];
      
      for (const mcpResponse of mcpResponses) {
        await this.storeMCPResponse(mcpResponse, mcpRequestId);
        await this.storeEvaluation(mcpResponse, mcpRequest, sessionId);

        results.push({
          provider: mcpResponse.provider,
          model: mcpResponse.model,
          response: mcpResponse.content,
          responseTime: mcpResponse.metadata.responseTime,
          tokenCount: mcpResponse.metadata.tokenCount,
          costEstimate: mcpResponse.metadata.costEstimate,
          qualityScore: mcpResponse.performance.qualityScore,
          coherenceScore: mcpResponse.performance.coherenceScore,
          helpfulnessScore: mcpResponse.performance.helpfulnessScore,
          error: mcpResponse.error
        });
      }

      const summary = this.calculateBenchmarkSummary(results);

      await this.dbClient
        .from('benchmark_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      return {
        sessionId,
        summary,
        results,
        mcpRequestId
      };

    } catch (error) {
      await this.dbClient
        .from('benchmark_sessions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      throw error;
    }
  }

  async getAnalytics(): Promise<AnalyticsData> {
    if (!this.dbClient) {
      throw new Error('Database not configured');
    }

    try {
      const { data: providerStats, error: statsError } = await this.dbClient
        .from('llm_provider_stats')
        .select('*')
        .order('avg_quality_score', { ascending: false });

      if (statsError) throw statsError;

      const { data: sessionHistory, error: historyError } = await this.dbClient
        .from('benchmark_sessions')
        .select('*')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);

      if (historyError) throw historyError;

      const costAnalysis = this.calculateCostAnalysis(providerStats || []);
      const qualityMetrics = this.calculateQualityMetrics(providerStats || []);

      return {
        providerStats: (providerStats || []).map((stat: any) => ({
          provider: stat.provider,
          modelName: stat.model_name,
          totalRequests: stat.total_requests,
          avgResponseTime: stat.avg_response_time_ms,
          avgQualityScore: stat.avg_quality_score,
          successRate: stat.success_rate,
          totalCost: stat.total_cost,
          lastUpdated: stat.last_updated
        })),
        sessionHistory: (sessionHistory || []).map((session: any) => ({
          sessionId: session.id,
          sessionName: session.session_name,
          questionCount: session.question_count,
          providerCount: session.provider_count,
          avgQualityScore: 0,
          totalCost: 0,
          completedAt: session.completed_at
        })),
        costAnalysis,
        qualityMetrics
      };

    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  async getRecentEvaluations(limit: number = 50): Promise<any[]> {
    if (!this.dbClient) {
      throw new Error('Database not configured');
    }

    const { data, error } = await this.dbClient
      .from('recent_evaluations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error('Failed to fetch recent evaluations: ' + error.message);
    }

    return data || [];
  }

  async refreshAnalytics(): Promise<void> {
    if (!this.dbClient) {
      throw new Error('Database not configured');
    }

    const { error } = await this.dbClient.rpc('refresh_analytics_summary');
    
    if (error) {
      throw new Error('Failed to refresh analytics: ' + error.message);
    }
  }

  private async getRelevantContext(query: string, limit: number = 5): Promise<string> {
    if (!this.dbClient) return '';

    try {
      const { data: docs, error } = await this.dbClient
        .from('documents_text')
        .select('title, clean_text')
        .textSearch('clean_text', query)
        .limit(limit);

      if (error || !docs || docs.length === 0) return '';

      return docs.map((doc: any) => 
        '**' + doc.title + '**\n' + doc.clean_text.substring(0, 500) + '...'
      ).join('\n\n');

    } catch (error) {
      console.error('Error getting context:', error);
      return '';
    }
  }

  private async storeMCPRequest(request: MCPRequest, sessionId: number): Promise<void> {
    if (!this.dbClient) return;

    const enhancedMessage = request.context ? 
      request.context + '\n\nUser Question: ' + request.message : 
      request.message;

    const { error } = await this.dbClient
      .from('mcp_requests')
      .insert({
        id: request.id,
        session_id: sessionId,
        user_id: request.metadata?.userId,
        original_message: request.message,
        enhanced_message: enhancedMessage,
        context_used: !!request.context,
        context_preview: request.context?.substring(0, 500),
        parameters: request.parameters,
        metadata: request.metadata
      });

    if (error) {
      console.error('Error storing MCP request:', error);
    }
  }

  private async storeMCPResponse(response: MCPResponse, requestId: string): Promise<void> {
    if (!this.dbClient) return;

    const { error } = await this.dbClient
      .from('mcp_responses')
      .insert({
        mcp_request_id: requestId,
        provider: response.provider,
        model_name: response.model,
        content: response.content,
        response_time_ms: response.metadata.responseTime,
        token_count: response.metadata.tokenCount,
        cost_estimate: response.metadata.costEstimate,
        quality_score: response.performance.qualityScore,
        coherence_score: response.performance.coherenceScore,
        helpfulness_score: response.performance.helpfulnessScore,
        error_message: response.error,
        mcp_metadata: response.metadata
      });

    if (error) {
      console.error('Error storing MCP response:', error);
    }
  }

  private async storeEvaluation(response: MCPResponse, request: MCPRequest, sessionId: number): Promise<void> {
    if (!this.dbClient) return;

    const { error } = await this.dbClient
      .from('llm_evaluations')
      .insert({
        session_id: sessionId,
        question: request.message,
        answer: response.content,
        model_name: response.model,
        provider: response.provider,
        mcp_request_id: request.id,
        response_time_ms: response.metadata.responseTime,
        token_count: response.metadata.tokenCount,
        cost_estimate: response.metadata.costEstimate,
        quality_score: response.performance.qualityScore,
        helpfulness_score: response.performance.helpfulnessScore,
        coherence_score: response.performance.coherenceScore,
        factual_accuracy: (response.performance.qualityScore + response.performance.helpfulnessScore) / 2,
        context_used: !!request.context,
        context_docs_count: request.context ? 3 : 0,
        error_message: response.error
      });

    if (error) {
      console.error('Error storing evaluation:', error);
    }
  }

  private calculateBenchmarkSummary(results: ProviderResult[]): BenchmarkSummary {
    const validResults = results.filter(r => !r.error);
    
    if (validResults.length === 0) {
      return {
        totalProviders: results.length,
        avgResponseTime: 0,
        avgQualityScore: 0,
        totalCost: 0,
        bestPerformer: 'None',
        fastestProvider: 'None'
      };
    }

    const avgResponseTime = validResults.reduce((sum, r) => sum + r.responseTime, 0) / validResults.length;
    const avgQualityScore = validResults.reduce((sum, r) => sum + r.qualityScore, 0) / validResults.length;
    const totalCost = validResults.reduce((sum, r) => sum + r.costEstimate, 0);
    
    const bestPerformer = validResults.reduce((best, current) => 
      current.qualityScore > best.qualityScore ? current : best
    );
    
    const fastestProvider = validResults.reduce((fastest, current) => 
      current.responseTime < fastest.responseTime ? current : fastest
    );

    return {
      totalProviders: results.length,
      avgResponseTime: Math.round(avgResponseTime),
      avgQualityScore: Math.round(avgQualityScore * 100) / 100,
      totalCost: Math.round(totalCost * 100000) / 100000,
      bestPerformer: bestPerformer.provider + '/' + bestPerformer.model,
      fastestProvider: fastestProvider.provider + '/' + fastestProvider.model
    };
  }

  private calculateCostAnalysis(providerStats: any[]): CostAnalysis {
    const totalCost = providerStats.reduce((sum, stat) => sum + (stat.total_cost || 0), 0);
    const totalRequests = providerStats.reduce((sum, stat) => sum + (stat.total_requests || 0), 0);
    
    const costByProvider = providerStats.map(stat => ({
      provider: stat.provider + '/' + stat.model_name,
      cost: stat.total_cost || 0
    }));

    const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
    const projectedMonthlyCost = avgCostPerRequest * 1000 * 30;

    return {
      totalCost,
      costByProvider,
      avgCostPerRequest,
      projectedMonthlyCost
    };
  }

  private calculateQualityMetrics(providerStats: any[]): QualityMetrics {
    const validStats = providerStats.filter(stat => stat.avg_quality_score > 0);
    const overallQualityScore = validStats.length > 0 
      ? validStats.reduce((sum, stat) => sum + stat.avg_quality_score, 0) / validStats.length 
      : 0;

    const qualityByCategory = [
      { 
        category: 'Fast Models', 
        score: validStats
          .filter(stat => stat.provider === 'groq' && stat.model_name.includes('8b'))
          .reduce((sum, stat, _, arr) => sum + stat.avg_quality_score / (arr.length || 1), 0) 
      },
      { 
        category: 'Quality Models', 
        score: validStats
          .filter(stat => stat.model_name.includes('70b') || stat.provider === 'openrouter')
          .reduce((sum, stat, _, arr) => sum + stat.avg_quality_score / (arr.length || 1), 0) 
      }
    ].filter(cat => cat.score > 0);

    const improvementSuggestions = [
      overallQualityScore < 70 ? 'Consider using context more frequently to improve answer quality' : '',
      'Monitor response times and adjust provider selection based on use case',
      'Regular benchmarking helps identify the best performing models for your specific use cases'
    ].filter(suggestion => suggestion !== '');

    return {
      overallQualityScore,
      qualityByCategory,
      improvementSuggestions
    };
  }
}
