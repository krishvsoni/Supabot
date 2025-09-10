import { NextRequest, NextResponse } from 'next/server';
import { MCPBenchmarkingService } from '../../../../lib/mcp-benchmarking-service';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const timeRange = (url.searchParams.get('timeRange') || '24h') as '1h' | '24h' | '7d' | '30d' | 'all';
    const action = url.searchParams.get('action') || 'analytics';
    
    const mcpService = new MCPBenchmarkingService();
    
    console.log('📊 Getting MCP analytics:', { timeRange, action });
    
    switch (action) {
      case 'analytics':
        const analytics = await mcpService.getAnalytics();
        return NextResponse.json({
          success: true,
          architecture: 'MCP (Model Context Protocol)',
          timeRange,
          analytics
        });
        
      case 'recent':
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const recentEvaluations = await mcpService.getRecentEvaluations(limit);
        return NextResponse.json({
          success: true,
          architecture: 'MCP (Model Context Protocol)',
          recentEvaluations,
          count: recentEvaluations.length
        });
        
      case 'refresh':
        await mcpService.refreshAnalytics();
        return NextResponse.json({
          success: true,
          message: 'Analytics refreshed successfully',
          architecture: 'MCP (Model Context Protocol)'
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Use: analytics, recent, or refresh' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('MCP Analytics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get MCP analytics',
        architecture: 'MCP (Model Context Protocol)'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    const mcpService = new MCPBenchmarkingService();
    
    switch (action) {
      case 'refresh':
        await mcpService.refreshAnalytics();
        return NextResponse.json({
          success: true,
          message: 'Analytics refreshed successfully',
          architecture: 'MCP (Model Context Protocol)'
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('MCP Analytics POST error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to process MCP analytics request',
        architecture: 'MCP (Model Context Protocol)'
      },
      { status: 500 }
    );
  }
}
