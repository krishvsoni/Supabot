import { NextRequest, NextResponse } from 'next/server';
import { EnhancedLLMEvaluationService } from '../../../lib/llm-evaluation-enhanced';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { message, useContext = true, selectedProvider } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get user information for logging
    let user;
    try {
      user = await currentUser();
    } catch (error) {
      console.log('User not authenticated, proceeding without user ID');
    }

    const evaluationService = new EnhancedLLMEvaluationService();
    
    // Generate a session ID for this conversation
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use the enhanced chat service
    const result = await evaluationService.chatWithProvider({
      message,
      useContext,
      selectedProvider,
      userId: user?.id,
      sessionId
    });
    
    return NextResponse.json({
      success: true,
      response: result.answer,
      model: result.model,
      provider: result.provider,
      responseTime: result.responseTime,
      context: result.context,
      contextDocs: result.contextDocs?.length || 0,
      qualityScore: result.quality_score,
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
