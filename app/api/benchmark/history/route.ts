import { NextRequest, NextResponse } from 'next/server';

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

export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('Benchmark history API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
