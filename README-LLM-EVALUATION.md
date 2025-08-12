# LLM Evaluation Dashboard

A comprehensive system for evaluating and benchmarking multiple free LLM providers using your Supabase documentation data.

## Features

- **Multi-LLM Evaluation**: Compare responses across 4 free LLM providers
- **Real-time Metrics**: Track performance, quality, cost, and response times
- **Smart Chat**: Automatically use the best performing model
- **Interactive Dashboard**: Web-based interface for managing evaluations
- **CLI Tools**: Command-line utilities for batch processing
- **Supabase Integration**: Store and analyze results in your database

## Supported Providers

| Provider | Models | Free Tier | Strengths |
|----------|--------|-----------|-----------|
| **Groq** | Mixtral-8x7B, LLaMA3-70B | Yes | Ultra-fast inference |
| **Together AI** | Mistral-7B, LLaMA2-70B | Yes | Rich model selection |
| **Cohere** | Command | 1k calls/month | Structured responses |
| **OpenRouter** | OpenChat-7B, MythoMax-L2-13B | Free models | Multiple providers |

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd client
npm install
```

### 2. Configure Environment Variables

Copy the `.env` file and add the required API keys:

```bash
# Required API Keys (all free!)
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
NEXT_PUBLIC_TOGETHER_AI_API=your_together_api_key
NEXT_PUBLIC_COHERE_API_KEY=your_cohere_api_key
NEXT_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key

# Supabase Configuration
NEXT_PUBLIC_DATABASE_URL=your_supabase_database_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Clerk Authentication (already configured)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

### 3. Get Free API Keys

#### Groq (Recommended - Ultra Fast)
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up for free account
3. Generate API key
4. Add to `.env` as `NEXT_PUBLIC_GROQ_API_KEY`

#### Together AI (Rich Models)
1. Visit [together.ai](https://together.ai)
2. Sign up for free tier
3. Generate API key
4. Add to `.env` as `NEXT_PUBLIC_TOGETHER_AI_API`

#### Cohere (Structured Responses)
1. Visit [cohere.com](https://cohere.com)
2. Sign up for free trial (1k calls/month)
3. Generate API key
4. Add to `.env` as `NEXT_PUBLIC_COHERE_API_KEY`

#### OpenRouter (Free Models)
1. Visit [openrouter.ai](https://openrouter.ai)
2. Sign up for free account
3. Generate API key
4. Add to `.env` as `NEXT_PUBLIC_OPENROUTER_API_KEY`

#### Supabase (Database)
1. Get your Supabase project URL and anon key
2. Add to `.env` as shown above

### 4. Setup Database

Run the SQL commands in `lib/database-schema.sql` in your Supabase SQL editor to create the required tables.

### 5. Test Setup

```bash
npm run test-setup
```

This will verify all API keys and configurations are working.

## Usage

### Start the Development Server

```bash
npm run dev
```

Then visit [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

### CLI Commands

#### Quick Benchmark (5 questions)
```bash
npm run benchmark:quick
```

#### Standard Benchmark (15 questions)
```bash
npm run benchmark:standard
```

#### Comprehensive Benchmark (30 questions)
```bash
npm run benchmark:comprehensive
```

#### Custom Question Count
```bash
npm run benchmark 50
```

##  Dashboard Features

### Overview Tab
- **Provider Stats**: Performance metrics for each LLM provider
- **Cost Analysis**: Track spending across all providers
- **Quality Scores**: Compare response quality metrics
- **Response Times**: Monitor inference speed

### Benchmark Tab
- **Batch Evaluation**: Run evaluations across multiple questions
- **Provider Comparison**: Side-by-side performance analysis
- **Historical Trends**: Track improvements over time

### Evaluate Tab
- **Single Question Testing**: Test specific questions across all providers
- **Response Comparison**: Compare outputs quality and style
- **Real-time Metrics**: See performance data instantly

### Chat Tab
- **Smart Routing**: Automatically use best performing model
- **Context-Aware**: Include relevant documentation context
- **Performance Tracking**: Monitor chat response quality

##  Evaluation Metrics

The system tracks multiple quality metrics:

- **Response Time**: How fast each provider responds
- **Quality Score**: Overall response quality (0-100)
- **Cost Estimate**: Token usage and pricing
- **Helpfulness**: How actionable the response is
- **Coherence**: Logical flow and structure
- **Semantic Similarity**: Relevance to the question

##  Database Schema

The system creates these tables in Supabase:

- `llm_evaluations`: Individual evaluation results
- `benchmark_sessions`: Benchmark run metadata
- `llm_provider_stats`: Aggregated statistics view
- `recent_evaluations`: Recent evaluation results view

##  Use Cases

1. **Provider Selection**: Determine which LLM works best for your use case
2. **Cost Optimization**: Find the most cost-effective provider
3. **Quality Monitoring**: Track response quality over time
4. **Performance Benchmarking**: Compare inference speeds
5. **A/B Testing**: Test different prompts and configurations

##  Architecture

```
client/
├── lib/llm-evaluation.ts           # Core evaluation service
├── app/api/benchmark/route.ts      # Benchmark API endpoint
├── app/api/evaluate/route.ts       # Single evaluation API
├── app/api/chat/route.ts          # Smart chat API
├── components/EvaluationDashboard.tsx  # React dashboard
├── scripts/benchmark.mjs          # CLI benchmark tool
├── scripts/test-setup.mjs         # Setup verification
└── lib/database-schema.sql        # Database setup
```

##  Troubleshooting

### Environment Variables Not Loading
```bash
# Verify your .env file exists and has correct values
npm run test-setup
```

### API Key Errors
- Double-check API keys are valid and have correct permissions
- Ensure no extra spaces or quotes in the keys
- Test individual provider endpoints

### Database Connection Issues
- Verify Supabase URL and anon key are correct
- Check that database tables are created
- Ensure RLS policies allow access

### Rate Limiting
- Free tiers have rate limits - space out requests
- Use the CLI tools with delays between requests
- Monitor provider dashboards for usage

##  Next Steps

1. **Run Initial Benchmark**: `npm run benchmark:quick`
2. **Explore Dashboard**: Visit `/dashboard` to see results
3. **Test Individual Questions**: Use the Evaluate tab
4. **Setup Monitoring**: Track performance over time
5. **Optimize Costs**: Identify the most cost-effective providers

## You're Ready!

Your LLM evaluation system is now set up and ready to help you find the best free LLM providers for your Supabase documentation chatbot. Start with a quick benchmark and explore the results in the dashboard!

Need help? Check the troubleshooting section or run `npm run test-setup` to verify your configuration.
