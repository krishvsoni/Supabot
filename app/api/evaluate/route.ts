import { NextRequest, NextResponse } from 'next/server';
import { EnhancedLLMEvaluationService } from '../../../lib/llm-evaluation-enhanced';

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
    
    // Evaluate the question across all providers
    const results = await evaluationService.evaluateQuestionAcrossProviders(question, useContext);
    
    return NextResponse.json({
      success: true,
      question,
      results,
      providerCount: results.length,
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
