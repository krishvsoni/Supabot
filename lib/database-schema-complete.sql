-- Complete Database Schema for MCP-based LLM Evaluation and Benchmarking
-- This file includes all missing tables and fixes the data storage issues

-- 1. Table: benchmark_sessions (already exists, but let's ensure it's correct)
CREATE TABLE IF NOT EXISTS public.benchmark_sessions (
  id SERIAL PRIMARY KEY,
  session_name VARCHAR(255),
  description TEXT,
  question_count INTEGER DEFAULT 0,
  provider_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'running',
  created_by VARCHAR(100),
  session_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'automated', 'mcp_benchmark'
  mcp_version VARCHAR(20) DEFAULT '1.0'
);

-- 2. Table: llm_evaluations (already exists, let's ensure it has all needed columns)
CREATE TABLE IF NOT EXISTS public.llm_evaluations (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES public.benchmark_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  reference_answer TEXT,
  model_name VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  mcp_request_id VARCHAR(100), -- New: MCP request tracking
  response_time_ms INTEGER NOT NULL,
  token_count INTEGER NOT NULL DEFAULT 0,
  cost_estimate DECIMAL(10,6) NOT NULL DEFAULT 0,
  quality_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  helpfulness_score DECIMAL(5,2),
  coherence_score DECIMAL(5,2),
  factual_accuracy DECIMAL(5,2),
  bleu_score DECIMAL(5,4),
  rouge_score DECIMAL(5,4),
  semantic_similarity DECIMAL(5,4),
  context_used BOOLEAN DEFAULT FALSE,
  context_docs_count INTEGER DEFAULT 0,
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: llm_provider_stats (missing table!)
CREATE TABLE IF NOT EXISTS public.llm_provider_stats (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  total_requests INTEGER DEFAULT 0,
  total_response_time_ms BIGINT DEFAULT 0,
  avg_response_time_ms DECIMAL(8,2) DEFAULT 0,
  avg_quality_score DECIMAL(5,2) DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.0,
  error_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- MCP specific fields
  mcp_server_version VARCHAR(20),
  capabilities JSONB,
  
  UNIQUE(provider, model_name)
);

-- 4. Table: recent_evaluations (this should be a view, not a table)
DROP TABLE IF EXISTS public.recent_evaluations;
CREATE OR REPLACE VIEW public.recent_evaluations AS
SELECT 
  le.*,
  bs.session_name,
  bs.session_type,
  lps.avg_response_time_ms as provider_avg_response_time,
  lps.success_rate as provider_success_rate
FROM public.llm_evaluations le
LEFT JOIN public.benchmark_sessions bs ON le.session_id = bs.id
LEFT JOIN public.llm_provider_stats lps ON le.provider = lps.provider AND le.model_name = lps.model_name
ORDER BY le.created_at DESC;

-- 5. Table: mcp_requests (new table for MCP request tracking)
CREATE TABLE IF NOT EXISTS public.mcp_requests (
  id VARCHAR(100) PRIMARY KEY,
  session_id INTEGER REFERENCES public.benchmark_sessions(id) ON DELETE CASCADE,
  user_id VARCHAR(100),
  original_message TEXT NOT NULL,
  enhanced_message TEXT, -- Message with context
  context_used BOOLEAN DEFAULT FALSE,
  context_preview TEXT,
  parameters JSONB, -- MCP request parameters
  metadata JSONB,   -- MCP request metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table: mcp_responses (new table for MCP response tracking)
CREATE TABLE IF NOT EXISTS public.mcp_responses (
  id SERIAL PRIMARY KEY,
  mcp_request_id VARCHAR(100) REFERENCES public.mcp_requests(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  content TEXT,
  response_time_ms INTEGER,
  token_count INTEGER,
  cost_estimate DECIMAL(10,6) DEFAULT 0,
  quality_score DECIMAL(5,2) DEFAULT 0,
  coherence_score DECIMAL(5,2) DEFAULT 0,
  helpfulness_score DECIMAL(5,2) DEFAULT 0,
  error_message TEXT,
  mcp_metadata JSONB, -- MCP response metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table: evaluation_metrics (new table for detailed metrics)
CREATE TABLE IF NOT EXISTS public.evaluation_metrics (
  id SERIAL PRIMARY KEY,
  evaluation_id INTEGER REFERENCES public.llm_evaluations(id) ON DELETE CASCADE,
  metric_name VARCHAR(50) NOT NULL,
  metric_value DECIMAL(8,4) NOT NULL,
  metric_category VARCHAR(50), -- 'quality', 'performance', 'cost', 'accuracy'
  computed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table: benchmark_comparisons (new table for head-to-head comparisons)
CREATE TABLE IF NOT EXISTS public.benchmark_comparisons (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES public.benchmark_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  provider_a VARCHAR(50) NOT NULL,
  model_a VARCHAR(100) NOT NULL,
  response_a TEXT,
  score_a DECIMAL(5,2),
  provider_b VARCHAR(50) NOT NULL,
  model_b VARCHAR(100) NOT NULL,
  response_b TEXT,
  score_b DECIMAL(5,2),
  winner VARCHAR(50), -- 'a', 'b', 'tie'
  comparison_criteria VARCHAR(100),
  human_preference VARCHAR(50), -- if human evaluation involved
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Function: Update provider stats automatically
CREATE OR REPLACE FUNCTION update_provider_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert provider stats
  INSERT INTO public.llm_provider_stats (
    provider, 
    model_name, 
    total_requests, 
    total_response_time_ms, 
    avg_response_time_ms,
    avg_quality_score,
    total_cost,
    last_updated
  )
  VALUES (
    NEW.provider,
    NEW.model_name,
    1,
    NEW.response_time_ms,
    NEW.response_time_ms,
    NEW.quality_score,
    NEW.cost_estimate,
    NOW()
  )
  ON CONFLICT (provider, model_name) DO UPDATE SET
    total_requests = llm_provider_stats.total_requests + 1,
    total_response_time_ms = llm_provider_stats.total_response_time_ms + NEW.response_time_ms,
    avg_response_time_ms = (llm_provider_stats.total_response_time_ms + NEW.response_time_ms) / (llm_provider_stats.total_requests + 1),
    avg_quality_score = (llm_provider_stats.avg_quality_score * llm_provider_stats.total_requests + NEW.quality_score) / (llm_provider_stats.total_requests + 1),
    total_cost = llm_provider_stats.total_cost + NEW.cost_estimate,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update provider stats
DROP TRIGGER IF EXISTS trigger_update_provider_stats ON public.llm_evaluations;
CREATE TRIGGER trigger_update_provider_stats
  AFTER INSERT ON public.llm_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_stats();

-- 10. Function: Calculate evaluation summary
CREATE OR REPLACE FUNCTION get_evaluation_summary(session_id_param INTEGER)
RETURNS TABLE (
  total_evaluations BIGINT,
  avg_quality_score DECIMAL(5,2),
  avg_response_time DECIMAL(8,2),
  total_cost DECIMAL(10,6),
  provider_count BIGINT,
  best_performer VARCHAR(100),
  fastest_provider VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_evaluations,
    AVG(le.quality_score)::DECIMAL(5,2) as avg_quality_score,
    AVG(le.response_time_ms)::DECIMAL(8,2) as avg_response_time,
    SUM(le.cost_estimate)::DECIMAL(10,6) as total_cost,
    COUNT(DISTINCT le.provider)::BIGINT as provider_count,
    (SELECT le2.provider || '/' || le2.model_name 
     FROM public.llm_evaluations le2 
     WHERE le2.session_id = session_id_param 
     ORDER BY le2.quality_score DESC 
     LIMIT 1)::VARCHAR(100) as best_performer,
    (SELECT le3.provider || '/' || le3.model_name 
     FROM public.llm_evaluations le3 
     WHERE le3.session_id = session_id_param 
     ORDER BY le3.response_time_ms ASC 
     LIMIT 1)::VARCHAR(100) as fastest_provider
  FROM public.llm_evaluations le
  WHERE le.session_id = session_id_param;
END;
$$ LANGUAGE plpgsql;

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_llm_evaluations_session_id ON public.llm_evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_llm_evaluations_provider ON public.llm_evaluations(provider);
CREATE INDEX IF NOT EXISTS idx_llm_evaluations_timestamp ON public.llm_evaluations(timestamp);
CREATE INDEX IF NOT EXISTS idx_llm_evaluations_quality_score ON public.llm_evaluations(quality_score);
CREATE INDEX IF NOT EXISTS idx_llm_provider_stats_provider ON public.llm_provider_stats(provider);
CREATE INDEX IF NOT EXISTS idx_mcp_requests_session_id ON public.mcp_requests(session_id);
CREATE INDEX IF NOT EXISTS idx_mcp_responses_request_id ON public.mcp_responses(mcp_request_id);

-- 12. Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON public.recent_evaluations TO authenticated, anon;

-- 13. Insert some initial data for testing
INSERT INTO public.benchmark_sessions (session_name, description, status, session_type, mcp_version)
VALUES 
  ('MCP Initial Test', 'Testing MCP architecture implementation', 'completed', 'mcp_benchmark', '1.0'),
  ('Provider Comparison', 'Comparing all available providers', 'running', 'manual', '1.0')
ON CONFLICT DO NOTHING;

-- 14. Create materialized view for analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.analytics_summary AS
SELECT 
  date_trunc('day', le.created_at) as date,
  le.provider,
  le.model_name,
  COUNT(*) as request_count,
  AVG(le.quality_score) as avg_quality,
  AVG(le.response_time_ms) as avg_response_time,
  SUM(le.cost_estimate) as total_cost,
  COUNT(CASE WHEN le.error_message IS NULL THEN 1 END) as success_count,
  COUNT(CASE WHEN le.error_message IS NOT NULL THEN 1 END) as error_count
FROM public.llm_evaluations le
GROUP BY date_trunc('day', le.created_at), le.provider, le.model_name
ORDER BY date DESC, avg_quality DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_analytics_summary_date ON public.analytics_summary(date);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_provider ON public.analytics_summary(provider);

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_analytics_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Set up automatic refresh (you might want to call this periodically)
-- Example: SELECT refresh_analytics_summary();

COMMENT ON TABLE public.benchmark_sessions IS 'Stores benchmark session information for MCP-based evaluations';
COMMENT ON TABLE public.llm_evaluations IS 'Stores individual LLM evaluation results with MCP metadata';
COMMENT ON TABLE public.llm_provider_stats IS 'Aggregated statistics for each LLM provider/model combination';
COMMENT ON TABLE public.mcp_requests IS 'Tracks MCP request details for debugging and analytics';
COMMENT ON TABLE public.mcp_responses IS 'Stores individual MCP server responses';
COMMENT ON VIEW public.recent_evaluations IS 'Provides recent evaluations with session and provider context';
COMMENT ON TABLE public.evaluation_metrics IS 'Detailed metrics for each evaluation';
COMMENT ON TABLE public.benchmark_comparisons IS 'Head-to-head comparisons between models';
