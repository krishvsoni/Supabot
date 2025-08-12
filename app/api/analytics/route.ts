import { NextRequest, NextResponse } from 'next/server';
import { EnhancedLLMEvaluationService } from '../../../lib/llm-evaluation-enhanced';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') as '1h' | '24h' | '7d' | '30d' | 'all' || '24h';
    const detailed = searchParams.get('detailed') === 'true';

    const evaluationService = new EnhancedLLMEvaluationService();
    
    if (detailed) {
      const analytics = await evaluationService.getDetailedAnalytics(timeRange);
      return NextResponse.json({
        success: true,
        analytics
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
