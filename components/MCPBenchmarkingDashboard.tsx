"use client"

import { useState, useEffect } from "react"
import { Play, Clock, Star, DollarSign, History, BarChart3, CheckCircle, AlertCircle } from "lucide-react"

// MCP Response Types
interface MCPResponse {
  id: string
  model: string
  provider: string
  content: string
  metadata: {
    responseTime: number
    tokenCount: number
    costEstimate: number
    timestamp: string
  }
  performance: {
    qualityScore: number
    coherenceScore: number
    helpfulnessScore: number
  }
  error?: string
}

interface MCPBenchmarkResult {
  success: boolean
  message: string
  architecture: string
  sessionId: number
  summary: {
    totalProviders: number
    avgResponseTime: number
    avgQualityScore: number
    totalCost: number
    bestPerformer: string
    fastestProvider: string
  }
  results: MCPResponse[]
  mcpRequestId: string
  question: string
}

interface MCPAnalytics {
  success: boolean
  architecture: string
  timeRange: string
  analytics: {
    providerStats: Array<{
      provider: string
      modelName: string
      totalRequests: number
      avgResponseTime: number
      avgQualityScore: number
      successRate: number
      totalCost: number
      lastUpdated: string
    }>
    sessionHistory: Array<{
      sessionId: number
      sessionName: string
      questionCount: number
      providerCount: number
      avgQualityScore: number
      totalCost: number
      completedAt: string
    }>
    costAnalysis: {
      totalCost: number
      costByProvider: Array<{
        provider: string
        cost: number
        percentage: number
      }>
      avgCostPerRequest: number
      projectedMonthlyCost: number
    }
    qualityMetrics: {
      overallQualityScore: number
      qualityByCategory: Array<{
        category: string
        score: number
      }>
      improvementSuggestions: string[]
    }
  }
}

export default function MCPBenchmarkingDashboard() {
  const [testQuestion, setTestQuestion] = useState("")
  const [benchmarkResult, setBenchmarkResult] = useState<MCPBenchmarkResult | null>(null)
  const [analytics, setAnalytics] = useState<MCPAnalytics | null>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [useContext, setUseContext] = useState(true)
  const [activeTab, setActiveTab] = useState<'benchmark' | 'analytics' | 'history'>('benchmark')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const response = await fetch("/api/analytics/mcp")
      const data = await response.json()
      if (data.success) {
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Error fetching MCP analytics:", error)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const runMCPBenchmark = async () => {
    if (!testQuestion.trim()) return

    setTestLoading(true)
    try {
      const response = await fetch("/api/benchmark/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: testQuestion,
          useContext: useContext,
          sessionName: `MCP Benchmark: ${testQuestion.substring(0, 50)}${testQuestion.length > 50 ? '...' : ''}`,
          description: `MCP benchmark test for question: ${testQuestion}`
        }),
      })

      const data = await response.json()
      if (data.success) {
        setBenchmarkResult(data)
        // Refresh analytics after benchmark
        fetchAnalytics()
      } else {
        console.error("Benchmark failed:", data.error)
      }
    } catch (error) {
      console.error("Error running MCP benchmark:", error)
    } finally {
      setTestLoading(false)
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'groq': return '⚡'
      case 'cohere': return '🤖'
      case 'openrouter': return '🔀'
      default: return '🔮'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MCP Benchmarking Dashboard
          </h1>
          <p className="text-gray-600">
            Model Context Protocol (MCP) - Unified LLM Provider Interface
          </p>
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">MCP Architecture Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Database Connected</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'benchmark', name: 'Benchmark', icon: Play },
              { id: 'analytics', name: 'Analytics', icon: BarChart3 },
              { id: 'history', name: 'History', icon: History },
            ].map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as 'benchmark' | 'analytics' | 'history')}
                className={`flex items-center space-x-2 px-4 py-2 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Benchmark Tab */}
        {activeTab === 'benchmark' && (
          <div className="space-y-6">
            {/* Benchmark Input */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Run MCP Benchmark</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Test Question
                  </label>
                  <textarea
                    value={testQuestion}
                    onChange={(e) => setTestQuestion(e.target.value)}
                    placeholder="Enter your question to benchmark across all MCP providers..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={useContext}
                      onChange={(e) => setUseContext(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Use context from documentation</span>
                  </label>
                  <button
                    onClick={runMCPBenchmark}
                    disabled={testLoading || !testQuestion.trim()}
                    className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>{testLoading ? 'Running...' : 'Run Benchmark'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Benchmark Results */}
            {benchmarkResult && (
              <div className="space-y-6">
                {/* Summary Card */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4">Benchmark Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {benchmarkResult.summary?.totalProviders || 0}
                      </div>
                      <div className="text-sm text-gray-500">Providers Tested</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {benchmarkResult.summary?.avgResponseTime || 0}ms
                      </div>
                      <div className="text-sm text-gray-500">Avg Response Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {benchmarkResult.summary?.avgQualityScore || 0}%
                      </div>
                      <div className="text-sm text-gray-500">Avg Quality Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        ${(benchmarkResult.summary?.totalCost || 0).toFixed(4)}
                      </div>
                      <div className="text-sm text-gray-500">Total Cost</div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span><strong>Best Performer:</strong> {benchmarkResult.summary?.bestPerformer || 'N/A'}</span>
                      <span><strong>Fastest Provider:</strong> {benchmarkResult.summary?.fastestProvider || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="grid gap-4">
                  {benchmarkResult.results.map((result, index) => (
                    <div key={index} className="bg-white p-6 rounded-lg shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getProviderIcon(result.provider)}</span>
                          <div>
                            <h4 className="font-semibold">{result.model}</h4>
                            <p className="text-sm text-gray-500 capitalize">{result.provider}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <Clock className="w-4 h-4 text-gray-400 mx-auto" />
                            <div className="text-sm font-medium">{result.metadata?.responseTime || 0}ms</div>
                          </div>
                          <div className="text-center">
                            <Star className="w-4 h-4 text-yellow-400 mx-auto" />
                            <div className="text-sm font-medium">{result.performance?.qualityScore || 0}%</div>
                          </div>
                          <div className="text-center">
                            <DollarSign className="w-4 h-4 text-green-400 mx-auto" />
                            <div className="text-sm font-medium">${(result.metadata?.costEstimate || 0).toFixed(4)}</div>
                          </div>
                        </div>
                      </div>
                      
                      {result.error ? (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm text-red-700">{result.error}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="prose prose-sm max-w-none">
                            <div className="whitespace-pre-wrap text-gray-700">{result.content}</div>
                          </div>
                          <div className="flex space-x-4 text-xs text-gray-500">
                            <span>Coherence: {result.performance?.coherenceScore || 0}%</span>
                            <span>Helpfulness: {result.performance?.helpfulnessScore || 0}%</span>
                            <span>Tokens: {result.metadata?.tokenCount || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading analytics...</p>
              </div>
            ) : analytics ? (
              <>
                {/* Analytics Overview */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Cost Analysis</h3>
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      ${(analytics?.analytics?.costAnalysis?.totalCost || 0).toFixed(4)}
                    </div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <div className="mt-2 text-xs text-gray-500">
                      Avg per request: ${(analytics?.analytics?.costAnalysis?.avgCostPerRequest || 0).toFixed(4)}
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Quality Score</h3>
                    <div className="text-3xl font-bold text-purple-600 mb-2">
                      {analytics?.analytics?.qualityMetrics?.overallQualityScore || 0}%
                    </div>
                    <p className="text-sm text-gray-600">Overall Quality</p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Sessions</h3>
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {analytics?.analytics?.sessionHistory?.length || 0}
                    </div>
                    <p className="text-sm text-gray-600">Total Sessions</p>
                  </div>
                </div>

                {/* Provider Stats */}
                {analytics?.analytics?.providerStats && analytics.analytics.providerStats.length > 0 && (
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">Provider Performance</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requests</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Response Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {analytics.analytics.providerStats.map((stat, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <span className="mr-2">{getProviderIcon(stat?.provider || '')}</span>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{stat?.provider || 'Unknown'}</div>
                                    <div className="text-sm text-gray-500">{stat?.modelName || 'Unknown'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat?.totalRequests || 0}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat?.avgResponseTime || 0}ms</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stat?.avgQualityScore || 0}%</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{((stat?.successRate || 0) * 100).toFixed(1)}%</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(stat?.totalCost || 0).toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No analytics data available</p>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && analytics && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Session History</h3>
            {(analytics?.analytics?.sessionHistory?.length || 0) > 0 ? (
              <div className="space-y-4">
                {analytics.analytics.sessionHistory.map((session) => (
                  <div key={session?.sessionId || `session-${Math.random()}`} className="bg-white p-6 rounded-lg shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{session?.sessionName || 'Unnamed Session'}</h4>
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          <div>Questions: {session?.questionCount || 0} | Providers: {session?.providerCount || 0}</div>
                          <div>Avg Quality: {session?.avgQualityScore || 0}% | Cost: ${(session?.totalCost || 0).toFixed(4)}</div>
                          <div>Completed: {session?.completedAt ? new Date(session.completedAt).toLocaleString() : 'Unknown'}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        Session #{session?.sessionId || 'Unknown'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No session history available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
