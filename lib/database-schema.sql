-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.benchmark_sessions (
  id integer NOT NULL DEFAULT nextval('benchmark_sessions_id_seq'::regclass),
  session_name character varying,
  description text,
  question_count integer,
  provider_count integer,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  status character varying DEFAULT 'running'::character varying,
  CONSTRAINT benchmark_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chat_logs (
  id integer NOT NULL DEFAULT nextval('chat_logs_id_seq'::regclass),
  user_id character varying,
  session_id character varying,
  question text NOT NULL,
  answer text NOT NULL,
  model_name character varying NOT NULL,
  provider character varying NOT NULL,
  response_time_ms integer NOT NULL,
  token_count integer NOT NULL,
  cost_estimate numeric DEFAULT 0,
  quality_score numeric DEFAULT 0,
  context_used boolean DEFAULT false,
  context_docs_count integer DEFAULT 0,
  context_preview text,
  ip_address inet,
  user_agent text,
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.documents_text (
  id integer NOT NULL DEFAULT nextval('documents_text_id_seq'::regclass),
  file_path text UNIQUE,
  title text,
  content text,
  clean_text text,
  word_count integer,
  char_count integer,
  created_at timestamp without time zone DEFAULT now(),
  embedding USER-DEFINED,
  CONSTRAINT documents_text_pkey PRIMARY KEY (id)
);
CREATE TABLE public.llm_evaluations (
  id integer NOT NULL DEFAULT nextval('llm_evaluations_id_seq'::regclass),
  question text NOT NULL,
  answer text NOT NULL,
  reference_answer text,
  model_name character varying NOT NULL,
  provider character varying NOT NULL,
  response_time_ms integer NOT NULL,
  token_count integer NOT NULL,
  cost_estimate numeric NOT NULL DEFAULT 0,
  quality_score numeric NOT NULL DEFAULT 0,
  bleu_score numeric,
  rouge_score numeric,
  semantic_similarity numeric,
  helpfulness_score numeric,
  coherence_score numeric,
  factual_accuracy numeric,
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  session_id integer,
  CONSTRAINT llm_evaluations_pkey PRIMARY KEY (id),
  CONSTRAINT fk_llm_evaluations_session_id FOREIGN KEY (session_id) REFERENCES public.benchmark_sessions(id)
);