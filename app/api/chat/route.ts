import { NextRequest, NextResponse } from 'next/server';
import { LLMEvaluationService } from '../../../lib/llm-evaluation-v2';

export async function POST(request: NextRequest) {
  try {
    const { message, useContext = true } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    const evaluationService = new LLMEvaluationService();
    
    // Use the chatWithBestModel method
    const result = await evaluationService.chatWithBestModel(message, useContext);
    
    return NextResponse.json({
      success: true,
      response: result.answer,
      model: result.model,
      responseTime: result.responseTime,
      context: result.context,
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process chat message' 
      },
      { status: 500 }
    );
  }
}
