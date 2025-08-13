# Supabot: Personalized AI Chat Bot for Supabase

Supabot transforms raw Supabase documentation into intelligent, contextual AI responses using a hybrid search approach.

## Pipeline Overview


Find the pipeline source code on [GitHub](https://github.com/krishvsoni).
1. **HTML Scraping**  
    Extracts raw content from Supabase documentation.

2. **Text Cleaning**  
    Processes and structures the scraped text for consistency.

3. **Vector Embeddings**  
    Generates 1536-dimensional embeddings locally (no LLM required).

4. **Hybrid Search**  
    Combines semantic vector search with traditional keyword matching for optimal results.

5. **AI Response Generation**  
    Delivers contextual answers based on relevant documentation.

## Technology Stack

- **Supabase + pgvector**  
  Uses PostgreSQL with the pgvector extension to store and search 1536-dimensional embeddings.

- **Hybrid Search Engine**  
  Integrates semantic search and keyword matching for improved accuracy.


