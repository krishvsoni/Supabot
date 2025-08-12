'use client';

import { useState, useEffect } from 'react';

interface ProviderStats {
  provider: string;
  count: number;
  avgResponseTime: number;
  avgQualityScore: number;
  avgCost: number;
  totalCost: number;
}

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

export default function EvaluationDashboard() {
  const [stats, setStats] = useState<ProviderStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResults, setChatResults] = useState<EvaluationResult[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/benchmark');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats || []);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const runBenchmark = async (questionCount: number = 10) => {
    try {
      setBenchmarkRunning(true);
      const response = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionCount }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Benchmark completed! ${data.totalEvaluations} evaluations completed.`);
        fetchStats(); // Refresh stats
      } else {
        alert(`Benchmark failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error running benchmark:', error);
      alert('Failed to run benchmark');
    } finally {
      setBenchmarkRunning(false);
    }
  };

  const evaluateQuestion = async () => {
    if (!chatMessage.trim()) return;

    try {
      setChatLoading(true);
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: chatMessage }),
      });
      
      const data = await response.json();
      if (data.success) {
        setChatResults(data.results);
      } else {
        alert(`Evaluation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error evaluating question:', error);
      alert('Failed to evaluate question');
    } finally {
      setChatLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;

    try {
      setChatLoading(true);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatMessage }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Display the best response
        alert(`Best Model: ${data.model}\\nResponse: ${data.response.substring(0, 200)}...`);
      } else {
        alert(`Chat failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending chat:', error);
      alert('Failed to send chat message');
    } finally {
      setChatLoading(false);
    }
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      groq: 'bg-green-100 text-green-800',
      together: 'bg-blue-100 text-blue-800',
      cohere: 'bg-purple-100 text-purple-800',
      openrouter: 'bg-orange-100 text-orange-800',
    };
    return colors[provider] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: '📊' },
            { id: 'benchmark', name: 'Benchmark', icon: '🏃‍♂️' },
            { id: 'evaluate', name: 'Evaluate', icon: '🔍' },
            { id: 'chat', name: 'Chat', icon: '💬' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🤖</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Providers</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">⚡</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.length > 0
                      ? Math.round(stats.reduce((sum, s) => sum + s.avgResponseTime, 0) / stats.length)
                      : 0}ms
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Quality Score</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.length > 0
                      ? Math.round(stats.reduce((sum, s) => sum + s.avgQualityScore, 0) / stats.length)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Cost</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${stats.reduce((sum, s) => sum + s.totalCost, 0).toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Provider Performance</h2>
              <p className="text-sm text-gray-600">Comparison across all LLM providers</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Evaluations
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Response Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.map((stat, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProviderColor(stat.provider)}`}>
                            {stat.provider}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.avgResponseTime}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {stat.avgQualityScore}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${stat.avgCost.toFixed(6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${stat.totalCost.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'benchmark' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Run LLM Benchmark</h2>
            <p className="text-sm text-gray-600 mb-6">
              Evaluate all available LLM providers across multiple questions from your Supabase documentation.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => runBenchmark(5)}
                disabled={benchmarkRunning}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {benchmarkRunning ? 'Running...' : 'Quick Test (5 questions)'}
              </button>
              
              <button
                onClick={() => runBenchmark(15)}
                disabled={benchmarkRunning}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {benchmarkRunning ? 'Running...' : 'Standard Test (15 questions)'}
              </button>
              
              <button
                onClick={() => runBenchmark(30)}
                disabled={benchmarkRunning}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {benchmarkRunning ? 'Running...' : 'Comprehensive Test (30 questions)'}
              </button>
            </div>

            {benchmarkRunning && (
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
                      Benchmark is running... This may take several minutes depending on the number of questions and available providers.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'evaluate' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Evaluate Single Question</h2>
            <p className="text-sm text-gray-600 mb-6">
              Test a specific question across all LLM providers to compare responses.
            </p>
            
            <div className="space-y-4">
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Enter your question about Supabase documentation..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={3}
              />
              
              <button
                onClick={evaluateQuestion}
                disabled={chatLoading || !chatMessage.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {chatLoading ? 'Evaluating...' : 'Evaluate Across All Providers'}
              </button>
            </div>

            {chatResults.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-md font-semibold text-gray-900">Results</h3>
                {chatResults.map((result, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProviderColor(result.metrics.provider)}`}>
                        {result.metrics.model_name}
                      </span>
                      <div className="flex space-x-4 text-xs text-gray-500">
                        <span>Quality: {result.metrics.quality_score}%</span>
                        <span>Time: {result.metrics.response_time_ms}ms</span>
                        <span>Cost: ${result.metrics.cost_estimate.toFixed(6)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{result.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Smart Chat</h2>
            <p className="text-sm text-gray-600 mb-6">
              Chat using the best performing model based on current evaluations.
            </p>
            
            <div className="space-y-4">
              <textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask about Supabase documentation..."
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={3}
              />
              
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatMessage.trim()}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {chatLoading ? 'Getting Response...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
