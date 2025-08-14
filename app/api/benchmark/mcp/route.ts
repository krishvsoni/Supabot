import { NextRequest, NextResponse } from 'next/server';
import { MCPBenchmarkingService } from '../../../../lib/mcp-benchmarking-service';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const testQuestion = url.searchParams.get('question') || 'How do I get started with Supabase?';
  const useContext = url.searchParams.get('useContext') !== 'false';
  
  return runMCPBenchmark(testQuestion, useContext, false);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.question) {
      const useContext = body.useContext !== false;
      const comprehensive = body.comprehensive === true;
      
      return runMCPBenchmark(body.question, useContext, comprehensive, body.userId);
    } else {
      return runMCPBenchmark('How do I get started with Supabase?', true, false);
    }
  } catch (error) {
    console.error('MCP Benchmark error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to run MCP benchmark' },
      { status: 500 }
    );
  }
}

async function runMCPBenchmark(
  question: string, 
  useContext: boolean = true, 
  comprehensive: boolean = false,
  userId?: string
) {
  try {
    const mcpService = new MCPBenchmarkingService();
    
    console.log('Running MCP benchmark for:', question, '| Context:', useContext, '| Comprehensive:', comprehensive);
    
    // Create benchmark request
    const benchmarkRequest = {
      question,
      useContext,
      sessionName: comprehensive ? 
        `Comprehensive MCP Benchmark: ${question.substring(0, 50)}...` :
        `Single Question MCP: ${question.substring(0, 50)}...`,
      description: comprehensive ?
        `Comprehensive MCP benchmark starting with: ${question}` :
        `Single question MCP benchmark: ${question}`,
      userId
    };

    // Run the benchmark
    const result = await mcpService.runSingleQuestionBenchmark(benchmarkRequest);
    
    console.log(' MCP benchmark completed:', {
      sessionId: result.sessionId,
      totalProviders: result.summary.totalProviders,
      avgQualityScore: result.summary.avgQualityScore,
      bestPerformer: result.summary.bestPerformer
    });
    
    return NextResponse.json({
      success: true,
      message: 'MCP benchmark completed successfully',
      architecture: 'MCP (Model Context Protocol)',
      sessionId: result.sessionId,
      summary: result.summary,
      results: result.results,
      mcpRequestId: result.mcpRequestId,
      question: question,
      useContext: useContext,
      comprehensive: comprehensive
    });
    
  } catch (error) {
    console.error('MCP benchmark error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to run MCP benchmark',
        architecture: 'MCP (Model Context Protocol)'
      },
      { status: 500 }
    );
  }
}
