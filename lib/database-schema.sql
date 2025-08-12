-- Create table for storing LLM evaluation results
CREATE TABLE IF NOT EXISTS llm_evaluations (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  reference_answer TEXT,
  model_name VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  response_time_ms INTEGER NOT NULL,
  token_count INTEGER NOT NULL,
  cost_estimate DECIMAL(10, 8) NOT NULL DEFAULT 0,
  quality_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
  bleu_score DECIMAL(5, 2),
  rouge_score DECIMAL(5, 2),
  semantic_similarity DECIMAL(5, 2),
  helpfulness_score DECIMAL(5, 2),
  coherence_score DECIMAL(5, 2),
  factual_accuracy DECIMAL(5, 2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_llm_evaluations_provider ON llm_evaluations(provider);
CREATE INDEX IF NOT EXISTS idx_llm_evaluations_model ON llm_evaluations(model_name);
CREATE INDEX IF NOT EXISTS idx_llm_evaluations_timestamp ON llm_evaluations(timestamp);
CREATE INDEX IF NOT EXISTS idx_llm_evaluations_quality ON llm_evaluations(quality_score);

-- Create table for storing benchmark sessions
CREATE TABLE IF NOT EXISTS benchmark_sessions (
  id SERIAL PRIMARY KEY,
  session_name VARCHAR(200),
  description TEXT,
  question_count INTEGER,
  provider_count INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'running' -- 'running', 'completed', 'failed'
);

-- Create view for aggregated stats by provider
CREATE OR REPLACE VIEW llm_provider_stats AS
SELECT 
  provider,
  model_name,
  COUNT(*) as evaluation_count,
  AVG(response_time_ms) as avg_response_time,
  AVG(quality_score) as avg_quality_score,
  AVG(cost_estimate) as avg_cost_per_query,
  SUM(cost_estimate) as total_cost,
  AVG(helpfulness_score) as avg_helpfulness,
  AVG(coherence_score) as avg_coherence,
  AVG(semantic_similarity) as avg_semantic_similarity,
  MIN(timestamp) as first_evaluation,
  MAX(timestamp) as last_evaluation
FROM llm_evaluations 
GROUP BY provider, model_name;

-- Create view for recent evaluations
CREATE OR REPLACE VIEW recent_evaluations AS
SELECT 
  id,
  question,
  LEFT(answer, 100) || '...' as answer_preview,
  model_name,
  provider,
  response_time_ms,
  quality_score,
  cost_estimate,
  timestamp
FROM llm_evaluations
ORDER BY timestamp DESC
LIMIT 100;

-- Create semantic search view for documents_text table
CREATE OR REPLACE VIEW semantic_search_view AS
SELECT 
  id,
  file_path,
  title,
  clean_text,
  word_count,
  char_count,
  embedding,
  CASE 
    WHEN file_path ILIKE '%/guide/%' THEN 1.5
    WHEN file_path ILIKE '%/reference/%' THEN 1.2
    WHEN file_path ILIKE '%/quickstart/%' THEN 1.8
    ELSE 1.0
  END as path_boost,
  CASE
    WHEN file_path ILIKE '%auth%' THEN 'Authentication'
    WHEN file_path ILIKE '%database%' THEN 'Database'
    WHEN file_path ILIKE '%storage%' THEN 'Storage'
    WHEN file_path ILIKE '%edge-functions%' THEN 'Edge Functions'
    WHEN file_path ILIKE '%realtime%' THEN 'Realtime'
    ELSE 'General'
  END as category
FROM documents_text
WHERE clean_text IS NOT NULL 
  AND char_count > 100;

-- Create table for chat logs to track all conversations
CREATE TABLE IF NOT EXISTS chat_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  session_id VARCHAR(100),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  response_time_ms INTEGER NOT NULL,
  token_count INTEGER NOT NULL,
  cost_estimate DECIMAL(10, 8) DEFAULT 0,
  quality_score DECIMAL(5, 2) DEFAULT 0,
  context_used BOOLEAN DEFAULT false,
  context_docs_count INTEGER DEFAULT 0,
  context_preview TEXT,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chat logs
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_session_id ON chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_provider ON chat_logs(provider);
CREATE INDEX IF NOT EXISTS idx_chat_logs_timestamp ON chat_logs(timestamp);

-- RLS policies (adjust based on your auth setup)
ALTER TABLE llm_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access to evaluations" ON llm_evaluations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert access to evaluations" ON llm_evaluations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow read access to sessions" ON benchmark_sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert access to sessions" ON benchmark_sessions
  FOR INSERT TO authenticated WITH CHECK (true);
