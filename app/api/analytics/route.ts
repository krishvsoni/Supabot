import { NextRequest, NextResponse } from 'next/server';
import { EnhancedLLMEvaluationService } from '../../../lib/llm-evaluation-enhanced';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') as '1h' | '24h' | '7d' | '30d' | 'all' || '24h';
    const detailed = searchParams.get('detailed') === 'true';

    const evaluationService = new EnhancedLLMEvaluationService();
    
    if (detailed) {
      const analytics = await evaluationService.getDetailedAnalytics(timeRange);
      
      const additionalData = await getAdditionalAnalytics(timeRange);
      
      return NextResponse.json({
        success: true,
        analytics: {
          ...analytics,
          ...additionalData
        }
      });
    } else {
      const basicTimeRange = timeRange === 'all' ? '30d' : timeRange;
      const analytics = await evaluationService.getChatAnalytics(basicTimeRange as '1h' | '24h' | '7d' | '30d');
      return NextResponse.json({
        success: true,
        analytics
      });
    }
    
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch analytics' 
      },
      { status: 500 }
    );
  }
}

async function getAdditionalAnalytics(timeRange: string) {
  if (!supabase) {
    return getMockAdditionalAnalytics();
  }

  try {
    const timeRangeMap = {
      '1h': '1 hour',
      '24h': '24 hours', 
      '7d': '7 days',
      '30d': '30 days',
      'all': '100 years'
    };

    // Get questions with performance metrics
    const { data: questionMetrics, error: metricsError } = await supabase
      .from('chat_logs')
      .select('question, quality_score, response_time_ms, provider, context_used')
      .gte('timestamp', timeRange === 'all' ? '1970-01-01' : `now() - interval '${timeRangeMap[timeRange as keyof typeof timeRangeMap]}'`)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (metricsError) {
      console.error('Error fetching question metrics:', metricsError);
      return getMockAdditionalAnalytics();
    }

    // Process question metrics for graphs
    const questionPerformance = processQuestionMetrics(questionMetrics || []);
    
    // Get user activity over time
    const { data: userActivity, error: activityError } = await supabase
      .from('chat_logs')
      .select('timestamp, user_id')
      .gte('timestamp', timeRange === 'all' ? '1970-01-01' : `now() - interval '${timeRangeMap[timeRange as keyof typeof timeRangeMap]}'`)
      .order('timestamp', { ascending: true });

    if (activityError) {
      console.error('Error fetching user activity:', activityError);
    }

    const activityOverTime = processUserActivity(userActivity || []);

    // Get precision metrics by question type
    const precisionMetrics = calculatePrecisionMetrics(questionMetrics || []);

    return {
      questionPerformance,
      activityOverTime,
      precisionMetrics,
      totalQuestions: questionMetrics?.length || 0,
      avgPrecision: precisionMetrics.averagePrecision
    };

  } catch (error) {
    console.error('Error in getAdditionalAnalytics:', error);
    return getMockAdditionalAnalytics();
  }
}

function processQuestionMetrics(logs: Array<{
  question: string;
  quality_score?: number;
  response_time_ms: number;
  context_used: boolean;
  provider: string;
}>) {
  // Group questions by similarity and calculate metrics
  const questionGroups: { [key: string]: typeof logs } = {};
  
  logs.forEach(log => {
    const questionKey = log.question.substring(0, 50); // Group similar questions
    if (!questionGroups[questionKey]) {
      questionGroups[questionKey] = [];
    }
    questionGroups[questionKey].push(log);
  });

  return Object.entries(questionGroups).map(([question, logs]) => ({
    question,
    avgQualityScore: logs.reduce((sum, log) => sum + (log.quality_score || 0), 0) / logs.length,
    avgResponseTime: logs.reduce((sum, log) => sum + log.response_time_ms, 0) / logs.length,
    count: logs.length,
    contextUsageRate: logs.filter(log => log.context_used).length / logs.length * 100,
    providerDistribution: logs.reduce((acc: Record<string, number>, log) => {
      acc[log.provider] = (acc[log.provider] || 0) + 1;
      return acc;
    }, {})
  })).sort((a, b) => b.count - a.count).slice(0, 10);
}

function processUserActivity(activity: Array<{
  timestamp: string;
  user_id: string;
}>) {
  // Group activity by time periods
  const hourlyActivity: { [key: string]: number } = {};
  
  activity.forEach(log => {
    const hour = new Date(log.timestamp).toISOString().slice(0, 13); // Group by hour
    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
  });

  return Object.entries(hourlyActivity).map(([hour, count]) => ({
    time: hour,
    count,
    uniqueUsers: activity.filter(log => 
      new Date(log.timestamp).toISOString().slice(0, 13) === hour
    ).map(log => log.user_id).filter((id, index, arr) => arr.indexOf(id) === index).length
  })).sort((a, b) => a.time.localeCompare(b.time));
}

function calculatePrecisionMetrics(logs: Array<{
  question: string;
  quality_score?: number;
  context_used: boolean;
}>) {
  const categories = {
    'Authentication': logs.filter(log => log.question.toLowerCase().includes('auth')),
    'Database': logs.filter(log => log.question.toLowerCase().includes('database') || log.question.toLowerCase().includes('sql')),
    'Storage': logs.filter(log => log.question.toLowerCase().includes('storage') || log.question.toLowerCase().includes('file')),
    'Realtime': logs.filter(log => log.question.toLowerCase().includes('realtime') || log.question.toLowerCase().includes('subscription')),
    'General': logs.filter(log => !['auth', 'database', 'sql', 'storage', 'file', 'realtime', 'subscription'].some(term => log.question.toLowerCase().includes(term)))
  };

  const metrics = Object.entries(categories).map(([category, categoryLogs]) => {
    if (categoryLogs.length === 0) {
      return { category, precision: 0, recall: 0, f1: 0, count: 0 };
    }

    const avgQuality = categoryLogs.reduce((sum, log) => sum + (log.quality_score || 0), 0) / categoryLogs.length;
    const precision = avgQuality / 100; // Convert quality score to precision metric
    const recall = categoryLogs.filter(log => log.context_used).length / categoryLogs.length;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      category,
      precision: Number(precision.toFixed(3)),
      recall: Number(recall.toFixed(3)),
      f1: Number(f1.toFixed(3)),
      count: categoryLogs.length
    };
  });

  const averagePrecision = metrics.reduce((sum, metric) => sum + metric.precision, 0) / metrics.length;

  return {
    byCategory: metrics,
    averagePrecision: Number(averagePrecision.toFixed(3))
  };
}

function getMockAdditionalAnalytics() {
  return {
    questionPerformance: [
      {
        question: 'How do I set up authentication in Supabase?',
        avgQualityScore: 85.5,
        avgResponseTime: 450,
        count: 23,
        contextUsageRate: 87,
        providerDistribution: { 'groq': 15, 'cohere': 8 }
      },
      {
        question: 'What are the best practices for database design?',
        avgQualityScore: 82.3,
        avgResponseTime: 520,
        count: 18,
        contextUsageRate: 94,
        providerDistribution: { 'groq': 12, 'cohere': 6 }
      },
      {
        question: 'How do I implement real-time subscriptions?',
        avgQualityScore: 79.1,
        avgResponseTime: 380,
        count: 15,
        contextUsageRate: 80,
        providerDistribution: { 'groq': 10, 'cohere': 5 }
      }
    ],
    activityOverTime: Array.from({ length: 24 }, (_, i) => ({
      time: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString().slice(0, 13),
      count: Math.floor(Math.random() * 20) + 5,
      uniqueUsers: Math.floor(Math.random() * 10) + 2
    })),
    precisionMetrics: {
      byCategory: [
        { category: 'Authentication', precision: 0.89, recall: 0.85, f1: 0.87, count: 45 },
        { category: 'Database', precision: 0.92, recall: 0.88, f1: 0.90, count: 38 },
        { category: 'Storage', precision: 0.86, recall: 0.82, f1: 0.84, count: 22 },
        { category: 'Realtime', precision: 0.83, recall: 0.79, f1: 0.81, count: 19 },
        { category: 'General', precision: 0.78, recall: 0.75, f1: 0.76, count: 67 }
      ],
      averagePrecision: 0.856
    },
    totalQuestions: 191,
    avgPrecision: 0.856
  };
}

export async function POST(request: NextRequest) {
  try {
    const { question, useContext = true } = await request.json();
    
    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question is required' },
        { status: 400 }
      );
    }

    const evaluationService = new EnhancedLLMEvaluationService();
    
    const results = await evaluationService.evaluateQuestionAcrossProviders(question, useContext);
    
    return NextResponse.json({
      success: true,
      results
    });
    
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to evaluate question' 
      },
      { status: 500 }
    );
  }
}
