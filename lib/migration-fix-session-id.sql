-- Migration script to fix missing session_id column in llm_evaluations table
-- Run this if you encounter the "column le.session_id does not exist" error

-- Check if the llm_evaluations table exists and add session_id if missing
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'llm_evaluations') THEN
    -- Add session_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'llm_evaluations' AND column_name = 'session_id'
    ) THEN
      ALTER TABLE llm_evaluations ADD COLUMN session_id INTEGER;
      RAISE NOTICE 'Added session_id column to llm_evaluations table';
    ELSE
      RAISE NOTICE 'session_id column already exists in llm_evaluations table';
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'fk_llm_evaluations_session_id'
        AND table_name = 'llm_evaluations'
    ) THEN
      -- First ensure benchmark_sessions table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'benchmark_sessions') THEN
        ALTER TABLE llm_evaluations 
        ADD CONSTRAINT fk_llm_evaluations_session_id 
        FOREIGN KEY (session_id) REFERENCES benchmark_sessions(id);
        RAISE NOTICE 'Added foreign key constraint for session_id';
      ELSE
        RAISE NOTICE 'benchmark_sessions table does not exist, skipping foreign key constraint';
      END IF;
    ELSE
      RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
  ELSE
    RAISE NOTICE 'llm_evaluations table does not exist';
  END IF;
END $$;

-- Recreate the recent_evaluations view to ensure it works
DROP VIEW IF EXISTS recent_evaluations;
CREATE VIEW recent_evaluations AS
SELECT 
  le.*,
  bs.session_name
FROM llm_evaluations le
LEFT JOIN benchmark_sessions bs ON le.session_id = bs.id
ORDER BY le.created_at DESC;

-- Grant permissions
GRANT SELECT ON recent_evaluations TO authenticated, anon;
