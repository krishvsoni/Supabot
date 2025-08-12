import { ChatCohere } from "@langchain/cohere";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { createClient } from '@supabase/supabase-js';

// Types for our evaluation system
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
  model: any;
  costPerToken: number;
  maxTokens: number;
}

export interface EvaluationResult {
  question: string;
  answer: string;
  reference_answer?: string;
  metrics: EvaluationMetrics;
  timestamp: string;
}

export interface DocumentData {
  id: number;
  file_path: string;
  title: string;
  clean_text: string;
  word_count: number;
  char_count: number;
}

// Initialize Supabase client - extract project info from database URL
const databaseUrl = process.env.NEXT_PUBLIC_DATABASE_URL || '';
const projectId = databaseUrl.match(/postgres\.([^:]+)/)?.[1] || '';
const supabaseUrl = projectId ? `https://${projectId}.supabase.co` : '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnbGVpcm9hbW1tY2p4anRnZm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwODI0NTksImV4cCI6MjA0OTY1ODQ1OX0.Y5rJYHcG_dxRnzqAHYGPPGPzMwbVYmDEXhR0Q6VjCJM';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export class LLMEvaluationService {
  private providers: LLMProvider[] = [];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Groq - Fast inference with LLaMA models (FREE)
    if (process.env.NEXT_PUBLIC_GROQ_API_KEY) {
      this.providers.push({
        name: 'groq-llama3-70b',
        model: new ChatGroq({
          apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
          model: "llama3-70b-8192",
          temperature: 0.1,
        }),
        costPerToken: 0, // Free
        maxTokens: 8192
      });

      this.providers.push({
        name: 'groq-llama3-8b',
        model: new ChatGroq({
          apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
          model: "llama3-8b-8192",
          temperature: 0.1,
        }),
        costPerToken: 0, // Free
        maxTokens: 8192
      });
    }

    // Cohere - Good for structured responses (FREE TRIAL)
    if (process.env.NEXT_PUBLIC_COHERE_API_KEY) {
      this.providers.push({
        name: 'cohere-command',
        model: new ChatCohere({
          apiKey: process.env.NEXT_PUBLIC_COHERE_API_KEY,
          model: "command",
          temperature: 0.1,
        }),
        costPerToken: 0, // Free trial
        maxTokens: 4096
      });
    }

    // OpenRouter - Free models only
    if (process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
      this.providers.push({
        name: 'openrouter-openchat',
        model: new ChatOpenAI({
          apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
          configuration: {
            baseURL: "https://openrouter.ai/api/v1",
          },
          model: "openchat/openchat-7b:free",
          temperature: 0.1,
        }),
        costPerToken: 0, // Free
        maxTokens: 4096
      });

      this.providers.push({
        name: 'openrouter-mythomax',
        model: new ChatOpenAI({
          apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
          configuration: {
            baseURL: "https://openrouter.ai/api/v1",
          },
          model: "gryphe/mythomax-l2-13b:free",
          temperature: 0.1,
        }),
        costPerToken: 0, // Free
        maxTokens: 4096
      });
    }
  }

  // Fetch relevant documentation from your existing database
  async getRelevantContext(query: string, limit: number = 3): Promise<DocumentData[]> {
    if (!supabase) {
      console.warn('Supabase not configured');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('semantic_search_view')
        .select('id, file_path, title, clean_text, word_count, char_count')
        .textSearch('clean_text', query)
        .order('word_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching context:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getRelevantContext:', error);
      return [];
    }
  }

  // Get test questions from your documentation
  async getTestQuestions(limit: number = 20): Promise<string[]> {
    if (!supabase) {
      return this.getDefaultQuestions();
    }

    try {
      const { data, error } = await supabase
        .from('semantic_search_view')
        .select('title, clean_text')
        .order('word_count', { ascending: false })
        .limit(limit * 2);

      if (error) throw error;

      const questions = data
        .map(doc => this.extractQuestionsFromContent(doc.title, doc.clean_text))
        .flat()
        .slice(0, limit);

      return questions.length > 0 ? questions : this.getDefaultQuestions();
    } catch (error) {
      console.error('Error fetching test questions:', error);
      return this.getDefaultQuestions();
    }
  }

  private extractQuestionsFromContent(title: string, content: string): string[] {
    const questions: string[] = [];
    
    if (title) {
      questions.push(`What is ${title}?`);
      questions.push(`How do I use ${title}?`);
      questions.push(`Can you explain ${title} in detail?`);
    }

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    sentences.slice(0, 2).forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.includes('how') || trimmed.includes('what') || trimmed.includes('why')) {
        questions.push(trimmed + '?');
      }
    });

    return questions.slice(0, 3);
  }

  private getDefaultQuestions(): string[] {
    return [
      "What is Supabase and how does it work?",
      "How do I set up authentication in Supabase?",
      "What are the key features of Supabase database?",
      "How do I implement real-time subscriptions?",
      "What is Row Level Security in Supabase?",
      "How do I use Supabase Edge Functions?",
      "How do I set up a Supabase project?",
      "What database types does Supabase support?",
      "How do I manage users in Supabase?",
      "What are Supabase storage buckets?",
    ];
  }

  // Evaluate a single question across all providers
  async evaluateQuestion(question: string, useContext: boolean = true): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    
    // Get relevant context if requested
    let contextText = '';
    if (useContext) {
      const context = await this.getRelevantContext(question, 3);
      contextText = context.map(doc => 
        `Title: ${doc.title}\nContent: ${doc.clean_text.substring(0, 500)}...`
      ).join('\n\n');
    }

    const enhancedQuestion = contextText 
      ? `Context from Supabase documentation:\n${contextText}\n\nQuestion: ${question}\n\nPlease answer based on the provided context.`
      : question;

    for (const provider of this.providers) {
      try {
        const startTime = Date.now();
        
        const response = await provider.model.invoke([
          { 
            role: "system", 
            content: "You are a helpful assistant specializing in Supabase documentation. Provide accurate, concise, and helpful answers." 
          },
          { role: "user", content: enhancedQuestion }
        ]);

        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const answer = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
        const tokenCount = this.estimateTokenCount(answer);

        const metrics: EvaluationMetrics = {
          model_name: provider.name,
          provider: provider.name.split('-')[0],
          response_time_ms: responseTime,
          token_count: tokenCount,
          cost_estimate: tokenCount * provider.costPerToken,
          quality_score: await this.calculateQualityScore(question, answer),
          helpfulness_score: await this.calculateHelpfulnessScore(question, answer),
          coherence_score: this.calculateCoherenceScore(answer),
        };

        results.push({
          question,
          answer,
          metrics,
          timestamp: new Date().toISOString(),
        });

      } catch (error) {
        console.error(`Error evaluating with ${provider.name}:`, error);
        results.push({
          question,
          answer: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          metrics: {
            model_name: provider.name,
            provider: provider.name.split('-')[0],
            response_time_ms: -1,
            token_count: 0,
            cost_estimate: 0,
            quality_score: 0,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  // Chat with the best performing model
  async chatWithBestModel(message: string, useContext: boolean = true): Promise<{
    answer: string;
    model: string;
    responseTime: number;
    context?: string;
  }> {
    // Get relevant context
    let contextText = '';
    let contextDocs: DocumentData[] = [];
    
    if (useContext) {
      contextDocs = await this.getRelevantContext(message, 3);
      contextText = contextDocs.map(doc => 
        `${doc.title}: ${doc.clean_text.substring(0, 300)}...`
      ).join('\n\n');
    }

    const enhancedMessage = contextText 
      ? `Based on this Supabase documentation:\n${contextText}\n\nUser Question: ${message}\n\nPlease provide a helpful answer based on the documentation.`
      : message;

    // Try providers in order of preference (Groq first for speed)
    const preferredOrder = this.providers.sort((a, b) => {
      if (a.name.includes('groq')) return -1;
      if (b.name.includes('groq')) return 1;
      if (a.name.includes('cohere')) return -1;
      if (b.name.includes('cohere')) return 1;
      return 0;
    });

    for (const provider of preferredOrder) {
      try {
        const startTime = Date.now();
        
        const response = await provider.model.invoke([
          { 
            role: "system", 
            content: "You are a helpful Supabase documentation assistant. Provide clear, accurate answers based on the provided context." 
          },
          { role: "user", content: enhancedMessage }
        ]);

        const endTime = Date.now();
        const answer = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

        return {
          answer,
          model: provider.name,
          responseTime: endTime - startTime,
          context: contextDocs.length > 0 ? `Found ${contextDocs.length} relevant docs` : undefined,
        };

      } catch (error) {
        console.error(`Error with ${provider.name}:`, error);
        continue;
      }
    }

    throw new Error('All providers failed');
  }

  // Run benchmark evaluation
  async runBenchmark(questionCount: number = 10): Promise<EvaluationResult[]> {
    console.log(`Starting benchmark with ${questionCount} questions across ${this.providers.length} providers...`);
    
    const questions = await this.getTestQuestions(questionCount);
    const allResults: EvaluationResult[] = [];

    for (let i = 0; i < questions.length; i++) {
      console.log(`Evaluating question ${i + 1}/${questions.length}: ${questions[i].substring(0, 50)}...`);
      
      const questionResults = await this.evaluateQuestion(questions[i], true);
      allResults.push(...questionResults);

      // Add delay to respect rate limits
      await this.delay(2000);
    }

    // Store results
    await this.storeResults(allResults);
    return allResults;
  }

  // Store evaluation results
  private async storeResults(results: EvaluationResult[]): Promise<void> {
    if (!supabase) {
      console.warn('Supabase not configured - cannot store results');
      return;
    }

    try {
      const { error } = await supabase
        .from('llm_evaluations')
        .insert(results.map(result => ({
          question: result.question,
          answer: result.answer,
          model_name: result.metrics.model_name,
          provider: result.metrics.provider,
          response_time_ms: result.metrics.response_time_ms,
          token_count: result.metrics.token_count,
          cost_estimate: result.metrics.cost_estimate,
          quality_score: result.metrics.quality_score,
          helpfulness_score: result.metrics.helpfulness_score,
          coherence_score: result.metrics.coherence_score,
          timestamp: result.timestamp,
        })));

      if (error) {
        console.error('Error storing results:', error);
      } else {
        console.log(`Stored ${results.length} evaluation results`);
      }
    } catch (error) {
      console.error('Error storing results:', error);
    }
  }

  // Get evaluation statistics
  async getEvaluationStats(): Promise<any[]> {
    if (!supabase) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('llm_evaluations')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const statsByProvider = data.reduce((acc, result) => {
        const provider = result.provider;
        if (!acc[provider]) {
          acc[provider] = {
            provider,
            count: 0,
            avgResponseTime: 0,
            avgQualityScore: 0,
            avgCost: 0,
            totalCost: 0,
          };
        }

        acc[provider].count++;
        acc[provider].avgResponseTime += result.response_time_ms;
        acc[provider].avgQualityScore += result.quality_score;
        acc[provider].avgCost += result.cost_estimate;
        acc[provider].totalCost += result.cost_estimate;

        return acc;
      }, {});

      Object.values(statsByProvider).forEach((stats: any) => {
        stats.avgResponseTime = Math.round(stats.avgResponseTime / stats.count);
        stats.avgQualityScore = Math.round((stats.avgQualityScore / stats.count) * 100) / 100;
        stats.avgCost = Math.round((stats.avgCost / stats.count) * 100000) / 100000;
      });

      return Object.values(statsByProvider);
    } catch (error) {
      console.error('Error getting evaluation stats:', error);
      return [];
    }
  }

  // Utility methods
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async calculateQualityScore(question: string, answer: string): Promise<number> {
    let score = 50;

    if (answer.length > 50 && answer.length < 2000) score += 20;
    
    const questionWords = question.toLowerCase().split(' ');
    const answerWords = answer.toLowerCase().split(' ');
    const relevantWords = questionWords.filter(word => answerWords.includes(word));
    score += Math.min(relevantWords.length * 3, 30);

    return Math.min(score, 100);
  }

  private async calculateHelpfulnessScore(question: string, answer: string): Promise<number> {
    let score = 0;

    const actionWords = ['how', 'step', 'follow', 'install', 'configure', 'setup', 'create'];
    if (actionWords.some(word => answer.toLowerCase().includes(word))) score += 25;

    if (answer.includes('```') || answer.includes('example')) score += 25;
    if (answer.length > 100) score += 25;
    if (answer.includes('\n') || answer.includes('1.') || answer.includes('-')) score += 25;

    return score;
  }

  private calculateCoherenceScore(answer: string): number {
    let score = 50;

    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) score += 20;

    const flowWords = ['first', 'then', 'next', 'finally', 'however', 'therefore'];
    if (flowWords.some(word => answer.toLowerCase().includes(word))) score += 15;

    const words = answer.toLowerCase().split(/\W+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    score += Math.max((repetitionRatio - 0.5) * 30, -15);

    return Math.min(Math.max(score, 0), 100);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
