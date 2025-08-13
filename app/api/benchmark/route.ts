import { NextRequest, NextResponse } from 'next/server';
import { EnhancedLLMEvaluationService } from '../../../lib/llm-evaluation-enhanced';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const testQuestion = url.searchParams.get('question') || 'How do I get started with Supabase?';
  
  return runComprehensiveBenchmark(testQuestion);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.question) {
      if (body.comprehensive) {
        return runComprehensiveBenchmark(body.question, body.useContext);
      } else {
        return evaluateSingleQuestion(body.question, body.useContext);
      }
    } else {
      return runComprehensiveBenchmark('How do I get started with Supabase?');
    }
  } catch (error) {
    console.error('Benchmark error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run benchmark' },
      { status: 500 }
    );
  }
}

async function runComprehensiveBenchmark(userQuestion: string, useContext: boolean = true) {
  try {
    const evaluationService = new EnhancedLLMEvaluationService();
    
    console.log(`Running comprehensive benchmark starting with: ${userQuestion}`);
    const benchmarkResult = await evaluationService.runComprehensiveBenchmark(userQuestion, useContext);
    
    return NextResponse.json({
      success: true,
      message: `Comprehensive benchmark completed successfully`,
      sessionId: benchmarkResult.sessionId,
      summary: benchmarkResult.summary,
      questions: benchmarkResult.questions,
      userQuestion: userQuestion
    });
    
  } catch (error) {
    console.error('Comprehensive benchmark error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to run comprehensive benchmark' 
      },
      { status: 500 }
    );
  }
}

async function evaluateSingleQuestion(question: string, useContext: boolean = true) {
  try {
    const evaluationService = new EnhancedLLMEvaluationService();
    
    console.log(`Evaluating single question: ${question}`);
    const results = await evaluationService.evaluateQuestionAcrossProviders(question, useContext);
    
    // Transform results to include costEstimate
    const enhancedResults = results.map(result => ({
      ...result,
      costEstimate: result.costEstimate || 0, // Add default cost estimate
    }));
    
    return NextResponse.json({
      success: true,
      question,
      results: enhancedResults,
      providerCount: enhancedResults.length,
    });
    
  } catch (error) {
    console.error('Single question evaluation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to evaluate question' 
      },
      { status: 500 }
    );
  }
}
