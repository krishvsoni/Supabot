-- Enhanced database schema with semantic search function
-- This extends the existing database with vector search capabilities

-- Create the semantic search view if it doesn't exist
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

-- Create function for vector similarity search
-- This function will be used for semantic search when embeddings are available
CREATE OR REPLACE FUNCTION match_documents(
  query_text TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id INT,
  file_path TEXT,
  title TEXT,
  clean_text TEXT,
  word_count INT,
  char_count INT,
  path_boost FLOAT,
  category TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- If we have vector extension and embeddings, use similarity search
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RETURN QUERY
    SELECT 
      sv.id,
      sv.file_path,
      sv.title,
      sv.clean_text,
      sv.word_count,
      sv.char_count,
      sv.path_boost,
      sv.category,
      1 - (sv.embedding <=> openai_embedding(query_text)) as similarity
    FROM semantic_search_view sv
    WHERE sv.embedding IS NOT NULL
      AND 1 - (sv.embedding <=> openai_embedding(query_text)) > match_threshold
    ORDER BY sv.embedding <=> openai_embedding(query_text)
    LIMIT match_count;
  ELSE
    -- Fallback to text search with ranking
    RETURN QUERY
    SELECT 
      sv.id,
      sv.file_path,
      sv.title,
      sv.clean_text,
      sv.word_count,
      sv.char_count,
      sv.path_boost,
      sv.category,
      CASE 
        WHEN sv.title ILIKE '%' || query_text || '%' THEN 0.9
        WHEN sv.clean_text ILIKE '%' || query_text || '%' THEN 0.7
        ELSE 0.5
      END as similarity
    FROM semantic_search_view sv
    WHERE sv.clean_text ILIKE '%' || query_text || '%'
       OR sv.title ILIKE '%' || query_text || '%'
    ORDER BY 
      sv.path_boost DESC,
      similarity DESC,
      sv.word_count DESC
    LIMIT match_count;
  END IF;
END;
$$;

-- Create chat logs table if it doesn't exist
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
CREATE INDEX IF NOT EXISTS idx_chat_logs_model_name ON chat_logs(model_name);
CREATE INDEX IF NOT EXISTS idx_chat_logs_timestamp ON chat_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_logs_quality_score ON chat_logs(quality_score);

-- Create view for chat analytics
CREATE OR REPLACE VIEW chat_analytics_view AS
SELECT 
  provider,
  model_name,
  COUNT(*) as total_chats,
  AVG(response_time_ms) as avg_response_time,
  AVG(quality_score) as avg_quality_score,
  AVG(token_count) as avg_token_count,
  SUM(CASE WHEN context_used THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100 as context_usage_rate,
  AVG(context_docs_count) as avg_context_docs,
  MIN(timestamp) as first_chat,
  MAX(timestamp) as last_chat
FROM chat_logs
GROUP BY provider, model_name;

-- RLS policies for chat logs
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own chat logs
CREATE POLICY "Users can view own chat logs" ON chat_logs
  FOR SELECT USING (auth.uid()::text = user_id);

-- Allow users to insert their own chat logs
CREATE POLICY "Users can insert own chat logs" ON chat_logs
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Allow anonymous access for demo purposes (adjust based on your needs)
CREATE POLICY "Allow anonymous chat logging" ON chat_logs
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = '');

-- Grant necessary permissions
GRANT SELECT ON semantic_search_view TO authenticated, anon;
GRANT SELECT, INSERT ON chat_logs TO authenticated, anon;
GRANT SELECT ON chat_analytics_view TO authenticated, anon;
GRANT EXECUTE ON FUNCTION match_documents TO authenticated, anon;

-- Sample queries for testing
/*

-- Test semantic search view
SELECT * FROM semantic_search_view LIMIT 5;

-- Test the match_documents function
SELECT * FROM match_documents('authentication setup', 0.5, 3);

-- Test chat analytics
SELECT * FROM chat_analytics_view;

-- Insert sample chat log
INSERT INTO chat_logs (
  question, answer, model_name, provider, response_time_ms, 
  token_count, quality_score, context_used, context_docs_count
) VALUES (
  'How do I set up authentication?',
  'To set up authentication in Supabase...',
  'groq-llama3-8b',
  'groq',
  450,
  120,
  85.5,
  true,
  3
);

*/
