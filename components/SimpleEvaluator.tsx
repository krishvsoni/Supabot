'use client';

import { useState } from 'react';

interface EvaluationResult {
  question: string;
  answer: string;
  metrics: {
    model_name: string;
    provider: string;
    response_time_ms: number;
    quality_score: number;
    cost_estimate: number;
  };
}

export default function SimpleEvaluator() {
  const [question, setQuestion] = useState('');
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);

  const evaluateQuestion = async () => {
    if (!question.trim() || loading) return;

    setLoading(true);
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          useContext: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
      } else {
        alert(`Evaluation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error evaluating question:', error);
      alert('Failed to evaluate question');
    } finally {
      setLoading(false);
    }
  };

  const runBenchmark = async (questionCount: number) => {
    setBenchmarkLoading(true);
    try {
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionCount }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Benchmark completed! ${data.totalEvaluations} evaluations done. Check the dashboard for detailed results.`);
      } else {
        alert(`Benchmark failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error running benchmark:', error);
      alert('Failed to run benchmark');
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      groq: 'bg-green-100 text-green-800 border-green-200',
      cohere: 'bg-purple-100 text-purple-800 border-purple-200',
      openrouter: 'bg-orange-100 text-orange-800 border-orange-200',
    };
    return colors[provider] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const sampleQuestions = [
    "What is Supabase and how does it work?",
    "How do I set up authentication in Supabase?",
    "What is Row Level Security?",
    "How do I use Supabase Edge Functions?",
    "How do I create real-time subscriptions?",
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Single Question Evaluation */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Single Question Evaluation</h2>
        <p className="text-sm text-gray-600 mb-4">
          Test a specific question across all LLM providers (Groq, Cohere, OpenRouter)
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question or use a sample:
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {sampleQuestions.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => setQuestion(sample)}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question about Supabase documentation..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
          
          <button
            onClick={evaluateQuestion}
            disabled={loading || !question.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <span>🔍</span>
            )}
            <span>{loading ? 'Evaluating...' : 'Evaluate Across All Models'}</span>
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-md font-semibold text-gray-900">
              Evaluation Results ({results.length} providers)
            </h3>
            <div className="grid gap-4">
              {results
                .sort((a, b) => b.metrics.quality_score - a.metrics.quality_score)
                .map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getProviderColor(result.metrics.provider)}`}>
                      {result.metrics.model_name}
                    </span>
                    <div className="flex space-x-4 text-sm text-gray-500">
                      <span>Quality: {result.metrics.quality_score}%</span>
                      <span>Time: {result.metrics.response_time_ms}ms</span>
                      <span>Cost: ${result.metrics.cost_estimate.toFixed(6)}</span>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <div className="text-gray-700 whitespace-pre-wrap">{result.answer}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Benchmark Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Benchmark Evaluation</h2>
        <p className="text-sm text-gray-600 mb-6">
          Run evaluations across multiple questions from your Supabase documentation to compare provider performance.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => runBenchmark(5)}
            disabled={benchmarkLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            {benchmarkLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <span>⚡</span>
            )}
            <span>{benchmarkLoading ? 'Running...' : 'Quick Test (5 questions)'}</span>
          </button>
          
          <button
            onClick={() => runBenchmark(15)}
            disabled={benchmarkLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            {benchmarkLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <span>🎯</span>
            )}
            <span>{benchmarkLoading ? 'Running...' : 'Standard Test (15 questions)'}</span>
          </button>
          
          <button
            onClick={() => runBenchmark(30)}
            disabled={benchmarkLoading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
          >
            {benchmarkLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <span>🚀</span>
            )}
            <span>{benchmarkLoading ? 'Running...' : 'Comprehensive Test (30 questions)'}</span>
          </button>
        </div>

        {benchmarkLoading && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Benchmark is running... This may take several minutes. Results will be stored in the database for analysis.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
