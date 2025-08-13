"use client"

import { useState, useEffect } from "react"
import { Play, Clock, Star, DollarSign, History, Zap } from "lucide-react"

interface BenchmarkResult {
  provider: string
  displayName: string
  category: string
  response: string
  responseTime: number
  qualityScore: number
  tokenCount: number
  costEstimate: number
}

interface BenchmarkTest {
  id: string
  question: string
  timestamp: string
  results: BenchmarkResult[]
}

export default function BenchmarkingDashboard() {
  const [testQuestion, setTestQuestion] = useState("")
  const [testResults, setTestResults] = useState<BenchmarkResult[]>([])
  const [testHistory, setTestHistory] = useState<BenchmarkTest[]>([])
  const [testLoading, setTestLoading] = useState(false)
  const [selectedTest, setSelectedTest] = useState<string | null>(null)

  useEffect(() => {
    fetchTestHistory()
  }, [])

  const fetchTestHistory = async () => {
    try {
      const response = await fetch("/api/benchmark/history")
      const data = await response.json()
      if (data.success) {
        setTestHistory(data.history)
      }
    } catch (error) {
      console.error("Error fetching test history:", error)
    }
  }

  const runBenchmark = async () => {
    if (!testQuestion.trim()) return

    try {
      setTestLoading(true)
      const response = await fetch("/api/benchmark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: testQuestion,
          comprehensive: true,
          useContext: true
        }),
      })

      const data = await response.json()
      if (data.success) {
        // Show summary and first question results
        if (data.questions && data.questions.length > 0) {
          setTestResults(data.questions[0].results)
        }
        
        // Display summary
        alert(`Comprehensive benchmark completed!\n\nSummary:\n- Questions tested: ${data.summary?.totalQuestions || 'N/A'}\n- Total evaluations: ${data.summary?.totalEvaluations || 'N/A'}\n- Average response time: ${data.summary?.avgResponseTime ? Math.round(data.summary.avgResponseTime) + 'ms' : 'N/A'}\n- Average quality score: ${data.summary?.avgQualityScore ? data.summary.avgQualityScore.toFixed(1) : 'N/A'}`)
        
        fetchTestHistory() // Refresh history
      } else {
        alert(`Benchmark failed: ${data.error}`)
      }
    } catch (error) {
      console.error("Error running benchmark:", error)
      alert("Failed to run benchmark")
    } finally {
      setTestLoading(false)
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "fast":
        return "bg-green-100 text-green-800"
      case "balanced":
        return "bg-blue-100 text-blue-800"
      case "quality":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const formatTime = (ms: number) => {
    if (ms < 0) return "Error"
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatCost = (cost: number) => {
    if (cost < 0.01) return "<$0.01"
    return `$${cost.toFixed(4)}`
  }

  const loadHistoryTest = (test: BenchmarkTest) => {
    setSelectedTest(test.id)
    setTestQuestion(test.question)
    setTestResults(test.results)
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-green-200 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
              LLM Benchmarking
            </h1>
            <p className="text-gray-600">Compare performance across all AI providers with real-time testing</p>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-500" />
            Test your questions across multiple providers simultaneously
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Test Input */}
          <div className="bg-white rounded-3xl border border-green-200 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" />
              Run Benchmark Test
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Question</label>
                <textarea
                  value={testQuestion}
                  onChange={(e) => setTestQuestion(e.target.value)}
                  placeholder="Enter a question to benchmark across all providers..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-300 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <button
                onClick={runBenchmark}
                disabled={testLoading || !testQuestion.trim()}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-2xl hover:scale-105 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg shadow-green-500/25 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                {testLoading ? "Running Benchmark..." : "Test All Providers"}
              </button>
            </div>
          </div>

          {/* Results */}
          {testResults.length > 0 && (
            <div className="bg-white rounded-3xl border border-green-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-green-500" />
                Benchmark Results
              </h2>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-200">
                  <div className="text-xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    <Clock className="w-5 h-5 text-green-500" />
                    {Math.round(testResults.reduce((acc, r) => acc + r.responseTime, 0) / testResults.length)}ms
                  </div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-200">
                  <div className="text-xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    <Star className="w-5 h-5 text-green-500" />
                    {Math.round(testResults.reduce((acc, r) => acc + r.qualityScore, 0) / testResults.length)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Quality Score</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-200">
                  <div className="text-xl font-bold text-gray-900">
                    {Math.round(testResults.reduce((acc, r) => acc + r.tokenCount, 0) / testResults.length)}
                  </div>
                  <div className="text-sm text-gray-600">Avg Tokens</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-200">
                  <div className="text-xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    {formatCost(testResults.reduce((acc, r) => acc + r.costEstimate, 0))}
                  </div>
                  <div className="text-sm text-gray-600">Total Cost</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-4">
                {testResults
                  .sort((a, b) => b.qualityScore - a.qualityScore)
                  .map((result, index) => (
                    <div key={index} className="border border-gray-300 rounded-2xl p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{result.displayName}</span>
                          <span className={`px-3 py-1 rounded-xl text-xs ${getCategoryColor(result.category)}`}>
                            {result.category}
                          </span>
                          {index === 0 && (
                            <span className="px-3 py-1 rounded-xl text-xs bg-gradient-to-r from-yellow-100 to-yellow-200 border border-yellow-300 text-yellow-800 flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Best Quality
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(result.responseTime)}
                          </span>
                          <span
                            className={`font-medium ${getQualityColor(result.qualityScore)} flex items-center gap-1`}
                          >
                            <Star className="w-3 h-3" />
                            Q: {result.qualityScore}%
                          </span>
                          <span>{result.tokenCount} tokens</span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatCost(result.costEstimate)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 bg-white p-4 rounded-2xl border border-gray-200">
                        {result.response}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Test History Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-green-200 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-green-500" />
              Test History
            </h2>

            {testHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">No test history available</p>
            ) : (
              <div className="space-y-3">
                {testHistory.slice(0, 10).map((test) => (
                  <div
                    key={test.id}
                    onClick={() => loadHistoryTest(test)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      selectedTest === test.id
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 hover:border-green-300 bg-gray-50 hover:bg-green-50"
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 mb-1 truncate">{test.question}</div>
                    <div className="text-xs text-gray-500 mb-2">{new Date(test.timestamp).toLocaleDateString()}</div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{test.results.length} providers</span>
                      <span className="text-green-600 font-medium">
                        {Math.round(test.results.reduce((acc, r) => acc + r.qualityScore, 0) / test.results.length)}%
                        avg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-green-200 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              Quick Tests
            </h2>
            <div className="space-y-2">
              {[
                "How do I set up authentication in Supabase?",
                "What are the best practices for database design?",
                "How do I implement real-time subscriptions?",
                "Explain row level security policies",
              ].map((question, index) => (
                <button
                  key={index}
                  onClick={() => setTestQuestion(question)}
                  className="w-full text-left p-3 text-sm text-gray-700 hover:text-gray-900 hover:bg-green-50 rounded-2xl border border-gray-300 hover:border-green-300 transition-all duration-200"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
