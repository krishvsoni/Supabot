import { NextResponse } from 'next/server';
import { EnhancedLLMEvaluationService } from '../../../../lib/llm-evaluation-enhanced';

export async function GET() {
  try {
    const evaluationService = new EnhancedLLMEvaluationService();
    const providers = evaluationService.getAvailableProviders();
    
    return NextResponse.json({
      success: true,
      providers
    });
    
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch providers' 
      },
      { status: 500 }
    );
  }
}
