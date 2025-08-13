import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

interface BenchmarkTest {
  id: string;
  question: string;
  timestamp: string;
  results: BenchmarkResult[];
}

interface BenchmarkResult {
  provider: string;
  displayName: string;
  category: string;
  response: string;
  responseTime: number;
  qualityScore: number;
  tokenCount: number;
  costEstimate: number;
}

export async function GET() {
  try {
    if (!supabase) {
      return getMockHistory();
    }

    // Get recent benchmark sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('benchmark_sessions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);

    if (sessionsError) {
      console.error('Error fetching benchmark sessions:', sessionsError);
      return getMockHistory();
    }

    // Get evaluations for recent sessions
    const sessionIds = sessions?.map(s => s.id) || [];
    
    if (sessionIds.length === 0) {
      return getMockHistory();
    }

    const { data: evaluations, error: evaluationsError } = await supabase
      .from('llm_evaluations')
      .select('*')
      .in('session_id', sessionIds);

    if (evaluationsError) {
      console.error('Error fetching evaluations:', evaluationsError);
      return getMockHistory();
    }

    // Group evaluations by session and question
    const history = sessions?.map(session => {
      const sessionEvaluations = evaluations?.filter(e => e.session_id === session.id) || [];
      
      // Group by question - just take the first question for now
      const firstQuestion = sessionEvaluations[0]?.question || 'No questions found';
      const questionResults = sessionEvaluations
        .filter(e => e.question === firstQuestion)
        .map(evaluation => ({
          provider: evaluation.provider,
          displayName: evaluation.model_name,
          category: evaluation.provider === 'groq' ? 'fast' : 'balanced',
          response: evaluation.answer.substring(0, 100) + '...',
          responseTime: evaluation.response_time_ms,
          qualityScore: evaluation.quality_score,
          tokenCount: evaluation.token_count,
          costEstimate: evaluation.cost_estimate
        }));

      return {
        id: session.id.toString(),
        question: firstQuestion,
        timestamp: session.started_at,
        results: questionResults
      };
    }) || [];

    return NextResponse.json({
      success: true,
      history
    });

  } catch (error) {
    console.error('Benchmark history error:', error);
    return getMockHistory();
  }
}

function getMockHistory() {
  // Return mock history with sample results
  const mockHistory: BenchmarkTest[] = [
    {
      id: '1',
      question: 'How do I set up authentication in Supabase?',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      results: [
        {
          provider: 'groq-llama3-70b',
          displayName: 'Groq LLaMA 3 70B',
          category: 'quality',
          response: 'To set up authentication in Supabase...',
          responseTime: 1200,
          qualityScore: 85,
          tokenCount: 156,
          costEstimate: 0.0031
        },
        {
          provider: 'groq-llama3-8b',
          displayName: 'Groq LLaMA 3 8B',
          category: 'fast',
          response: 'Supabase Auth can be configured...',
          responseTime: 450,
          qualityScore: 78,
          tokenCount: 142,
          costEstimate: 0.0028
        }
      ],
    },
    {
      id: '2',
      question: 'What are the best practices for database design?',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      results: [
        {
          provider: 'groq-mixtral-8x7b',
          displayName: 'Groq Mixtral 8x7B',
          category: 'balanced',
          response: 'Database design best practices include...',
          responseTime: 890,
          qualityScore: 82,
          tokenCount: 198,
          costEstimate: 0.0040
        }
      ],
    },
  ];

  return NextResponse.json({
    success: true,
    history: mockHistory,
  });
}
