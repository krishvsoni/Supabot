import { NextRequest, NextResponse } from 'next/server';
import { LLMEvaluationService } from '../../../lib/llm-evaluation-v2';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const questionCount = parseInt(url.searchParams.get('count') || '10');
  return runBenchmark(questionCount);
}

export async function POST(request: NextRequest) {
  try {
    let questionCount = 10;
    
    try {
      const body = await request.json();
      questionCount = body.questionCount || 10;
    } catch (error) {
      // No body or invalid JSON, use default
      console.log('No JSON body, using default questionCount:', questionCount);
    }
    
    return runBenchmark(questionCount);
  } catch (error) {
    console.error('Benchmark error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run benchmark' },
      { status: 500 }
    );
  }
}

async function runBenchmark(questionCount: number) {
  try {
    
    const evaluationService = new LLMEvaluationService();
    
    // Run the benchmark
    console.log(`Starting benchmark with ${questionCount} questions...`);
    const results = await evaluationService.runBenchmark(questionCount);
    
    return NextResponse.json({
      success: true,
      message: `Benchmark completed successfully with ${results.length} evaluations`,
      results: results.slice(0, 5), // Return first 5 for preview
      totalEvaluations: results.length,
    });
    
  } catch (error) {
    console.error('Benchmark error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to run benchmark' 
      },
      { status: 500 }
    );
  }
}
