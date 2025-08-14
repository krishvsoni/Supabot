# MCP (Model Context Protocol) Implementation Guide

## Overview

This implementation provides a unified interface for multiple LLM providers through the Model Context Protocol (MCP). All providers return responses in the same standardized format, making evaluation and benchmarking consistent across all models.

## Architecture

```
[Your App] ⟷ [MCP Client] ⟷ [MCP Server: Cohere]
                         ⟷ [MCP Server: Groq]  
                         ⟷ [MCP Server: OpenRouter]
```

### Communication Flow

1. **Model Selection**: Pick "Groq", "Cohere", or "OpenRouter" from your interface
2. **MCP Client Call**: Client sends MCP-formatted request to selected server
3. **Provider API**: MCP server forwards request to actual LLM API
4. **Standardized Response**: All providers return responses in the same MCP format
5. **Evaluation & Benchmarking**: Consistent format enables seamless evaluation
6. **Database Storage**: All data is stored in structured tables for analytics

## Benefits

- **Unified Interface**: One interface for all LLM providers
- **Easy Provider Switching**: Change providers without rewriting logic
- **Consistent Evaluation**: Same metrics across all models
- **Comprehensive Analytics**: Detailed performance tracking
- **Cost Monitoring**: Track usage and costs across providers
- **Quality Scoring**: Automated quality assessment

## Setup

### 1. Database Setup

Run the database setup script to create all necessary tables:

```bash
cd ChatBot
npm run setup-mcp-db
```

Or manually execute the SQL in `lib/database-schema-complete.sql` in your Supabase SQL editor.

### 2. Environment Variables

Ensure you have the following environment variables set:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LLM Providers
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key
NEXT_PUBLIC_COHERE_API_KEY=your_cohere_api_key
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key
```

### 3. Package Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "setup-mcp-db": "tsx scripts/setup-mcp-database.ts",
    "test-mcp": "curl http://localhost:3000/api/benchmark/mcp?question=How%20do%20I%20use%20Supabase%20auth?",
    "mcp-analytics": "curl http://localhost:3000/api/analytics/mcp"
  }
}
```

## Database Schema

### Core Tables

1. **benchmark_sessions**: Tracks benchmark sessions
2. **llm_evaluations**: Stores individual evaluation results  
3. **llm_provider_stats**: Aggregated provider statistics
4. **mcp_requests**: MCP request tracking
5. **mcp_responses**: MCP response storage

### Views and Functions

- **recent_evaluations**: View of recent evaluations with session context
- **analytics_summary**: Materialized view for performance analytics
- **update_provider_stats()**: Auto-updates provider statistics

## API Endpoints

### Benchmarking API

#### `POST /api/benchmark/mcp`

Run benchmarks using the MCP architecture.

**Request Body:**
```json
{
  "question": "How do I set up authentication in Supabase?",
  "useContext": true,
  "comprehensive": false,
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "architecture": "MCP (Model Context Protocol)",
  "sessionId": 123,
  "summary": {
    "totalProviders": 3,
    "avgResponseTime": 450,
    "avgQualityScore": 85.5,
    "totalCost": 0.0025,
    "bestPerformer": "groq/llama3-70b-8192",
    "fastestProvider": "groq/llama3-8b-8192"
  },
  "results": [
    {
      "provider": "groq",
      "model": "llama3-8b-8192",
      "response": "To set up authentication...",
      "responseTime": 280,
      "tokenCount": 150,
      "costEstimate": 0,
      "qualityScore": 88,
      "coherenceScore": 85,
      "helpfulnessScore": 90
    }
  ]
}
```

### Analytics API

#### `GET /api/analytics/mcp`

Get comprehensive analytics data.

**Query Parameters:**
- `timeRange`: `1h`, `24h`, `7d`, `30d`, `all` (default: `24h`)
- `action`: `analytics`, `recent`, `refresh` (default: `analytics`)

**Response:**
```json
{
  "success": true,
  "architecture": "MCP (Model Context Protocol)",
  "analytics": {
    "providerStats": [
      {
        "provider": "groq",
        "modelName": "llama3-8b-8192",
        "totalRequests": 145,
        "avgResponseTime": 280,
        "avgQualityScore": 78,
        "successRate": 98.5,
        "totalCost": 0,
        "lastUpdated": "2024-08-14T23:30:00Z"
      }
    ],
    "sessionHistory": [...],
    "costAnalysis": {
      "totalCost": 0.156,
      "avgCostPerRequest": 0.0012,
      "projectedMonthlyCost": 36.0
    },
    "qualityMetrics": {
      "overallQualityScore": 82.5,
      "qualityByCategory": [
        { "category": "Fast Models", "score": 78.2 },
        { "category": "Quality Models", "score": 86.8 }
      ]
    }
  }
}
```

## Usage Examples

### Basic Benchmark

```typescript
import { MCPBenchmarkingService } from './lib/mcp-benchmarking-service';

const service = new MCPBenchmarkingService();

const result = await service.runSingleQuestionBenchmark({
  question: "How do I implement row level security?",
  useContext: true,
  userId: "user123"
});

console.log('Best performer:', result.summary.bestPerformer);
console.log('Avg quality score:', result.summary.avgQualityScore);
```

### Get Analytics

```typescript
const analytics = await service.getAnalytics('7d');

console.log('Provider stats:', analytics.providerStats);
console.log('Cost analysis:', analytics.costAnalysis);
console.log('Quality metrics:', analytics.qualityMetrics);
```

### Get Recent Evaluations

```typescript
const recent = await service.getRecentEvaluations(20);
console.log('Recent evaluations:', recent);
```

## MCP Client Usage

```typescript
import { MCPClient } from './lib/mcp-client';

const client = new MCPClient();

// Get available servers
const servers = client.getAvailableServers();

// Send request to specific server
const response = await client.sendRequest('groq', {
  id: 'req-123',
  message: 'How do I use Supabase?',
  context: 'Some relevant documentation...'
});

// Broadcast to all servers (for benchmarking)
const allResponses = await client.broadcastRequest({
  id: 'req-123',
  message: 'How do I use Supabase?'
});
```

## Monitoring and Analytics

### Quality Metrics

The system automatically calculates:
- **Quality Score**: Based on content characteristics and relevance
- **Coherence Score**: Measures logical flow and structure
- **Helpfulness Score**: Assesses how well the answer addresses the question
- **Response Time**: Latency measurement
- **Cost Estimation**: Token-based cost calculation

### Performance Tracking

- Provider comparison across all metrics
- Historical performance trends
- Cost analysis and projections
- Success rate monitoring
- Error tracking and analysis

## Troubleshooting

### Common Issues

1. **"Database not configured"**
   - Check Supabase environment variables
   - Verify database connection

2. **"No providers available"**
   - Check API keys for LLM providers
   - Verify environment variables are loaded

3. **"Table does not exist"**
   - Run the database setup script
   - Manually execute the SQL schema

4. **Empty analytics data**
   - Run some benchmarks first
   - Check if data is being stored in tables
   - Refresh analytics materialized view

### Debug Mode

Set `NODE_ENV=development` to see detailed logging:

```bash
NODE_ENV=development npm run dev
```

### Manual Database Check

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%benchmark%' OR table_name LIKE '%mcp%';

-- Check recent data
SELECT * FROM recent_evaluations LIMIT 5;

-- Check provider stats
SELECT * FROM llm_provider_stats;
```

## Migration from Legacy System

If you're migrating from the old evaluation system:

1. **Backup existing data**
2. **Run the new database schema**
3. **Update API calls to use MCP endpoints**
4. **Test the new benchmarking flow**
5. **Update frontend components to use new response format**

The new system is backward compatible with existing `chat_logs` table.

## Performance Considerations

- **Parallel Execution**: MCP client executes requests to all providers in parallel
- **Caching**: Consider implementing response caching for repeated questions
- **Rate Limiting**: Be aware of provider rate limits
- **Database Optimization**: Indexes are created for common query patterns

## Future Enhancements

- [ ] Streaming support for real-time responses
- [ ] Custom model integration
- [ ] A/B testing framework
- [ ] Advanced analytics dashboard
- [ ] Automated quality assessment using reference answers
- [ ] Integration with monitoring services

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the database schema
3. Check API endpoint responses
4. Verify environment variables
5. Test individual components
