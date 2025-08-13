"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import LayoutWithSidebar from "@/components/LayoutWithSidebar"
import { MessageCircle, Zap, BarChart3, DollarSign, RefreshCw, TrendingUp } from "lucide-react"

interface ModelAnalytics {
  provider: string
  model_name: string
  total_chats: number
  avg_response_time: number
  avg_quality_score: number
  avg_token_count: number
  context_usage_rate: number
  avg_context_docs: number
  first_chat: string
  last_chat: string
  cost_estimate_total: number
}

interface QuestionPerformance {
  question: string
  avgQualityScore: number
  avgResponseTime: number
  count: number
  contextUsageRate: number
  providerDistribution: { [key: string]: number }
}

interface ActivityData {
  time: string
  count: number
  uniqueUsers: number
}

interface PrecisionMetrics {
  byCategory: {
    category: string
    precision: number
    recall: number
    f1: number
    count: number
  }[]
  averagePrecision: number
}

interface Analytics {
  modelStats: ModelAnalytics[]
  popularQuestions: { question: string; count: number }[]
  totalChats: number
  timeRange: string
  totalCost: number
  avgResponseTime: number
  avgQualityScore: number
  questionPerformance?: QuestionPerformance[]
  activityOverTime?: ActivityData[]
  precisionMetrics?: PrecisionMetrics
  totalQuestions?: number
}

export default function AnalyticsDashboard() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d" | "30d" | "all">("24h")
  const [activeTab, setActiveTab] = useState("overview")
  const [sortBy, setSortBy] = useState<"chats" | "quality" | "speed" | "cost">("chats")

  // Redirect if not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/')
    }
  }, [isLoaded, user, router])

  useEffect(() => {
    if (user) {
      fetchAnalytics()
    }
  }, [timeRange, user])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics?timeRange=${timeRange}&detailed=true`)
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const formatTime = (ms: number) => {
    if (ms < 0) return "Error"
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatCost = (cost: number) => {
    if (cost < 0.01) return "<$0.01"
    return `$${cost.toFixed(4)}`
  }

  const sortedModels = analytics?.modelStats
    ? [...analytics.modelStats].sort((a, b) => {
        switch (sortBy) {
          case "chats":
            return b.total_chats - a.total_chats
          case "quality":
            return b.avg_quality_score - a.avg_quality_score
          case "speed":
            return a.avg_response_time - b.avg_response_time
          case "cost":
            return (b.cost_estimate_total || 0) - (a.cost_estimate_total || 0)
          default:
            return 0
        }
      })
    : []

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  // Don't render anything if user is not authenticated (will be redirected by useEffect)
  if (!user) {
    return null
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-600">Comprehensive performance metrics for all AI models</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-green-500"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
              <button
                onClick={fetchAnalytics}
                disabled={loading}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-xl hover:scale-105 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-green-500/25 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {["overview", "models", "insights", "questions", "precision"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab === "overview" && "Overview"}
                  {tab === "models" && "Models"}
                  {tab === "insights" && "Insights"}
                  {tab === "questions" && "Questions"}
                  {tab === "precision" && "Precision"}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === "overview" && analytics && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">{analytics.totalChats.toLocaleString()}</p>
                    <p className="text-gray-600">Total Chats</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg">
                <div className="flex items-center">
                  <div className="p-3 bg-green-50 rounded-2xl border border-green-200">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">{formatTime(analytics.avgResponseTime)}</p>
                    <p className="text-gray-600">Avg Response Time</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200">
                    <BarChart3 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">{Math.round(analytics.avgQualityScore)}%</p>
                    <p className="text-gray-600">Avg Quality Score</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-50 rounded-2xl border border-orange-200">
                    <DollarSign className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-semibold text-gray-900">{formatCost(analytics.totalCost)}</p>
                    <p className="text-gray-600">Total Cost</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Questions Asked:</span>
                    <span className="font-semibold text-gray-900">
                      {analytics.totalQuestions || analytics.questionPerformance?.reduce((sum: number, q: any) => sum + q.count, 0) || analytics.totalChats}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unique Question Types:</span>
                    <span className="font-semibold text-gray-900">
                      {analytics.questionPerformance?.length || analytics.popularQuestions?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Users (Period):</span>
                    <span className="font-semibold text-gray-900">
                      {analytics.activityOverTime?.reduce((max: number, activity: any) => Math.max(max, activity.uniqueUsers), 0) || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Models Brief</h3>
                  <span className="text-sm text-gray-500">({analytics.modelStats.length} models)</span>
                </div>
                <div className="space-y-2">
                  {analytics.modelStats.slice(0, 3).map((model, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{model.provider}</div>
                        <div className="text-xs text-gray-500">{model.model_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-blue-600">{model.total_chats}</div>
                        <div className="text-xs text-gray-500">chats</div>
                      </div>
                    </div>
                  ))}
                  {analytics.modelStats.length > 3 && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setActiveTab("models")}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        View all {analytics.modelStats.length} models →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Top Questions</h3>
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="space-y-2">
                  {analytics.popularQuestions?.slice(0, 3).map((q, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="text-sm text-gray-700 flex-1 pr-2 truncate">{q.question}</div>
                      <div className="text-sm font-semibold text-green-600">{q.count}</div>
                    </div>
                  )) || analytics.questionPerformance?.slice(0, 3).map((q, index) => (
                    <div key={index} className="flex justify-between items-start">
                      <div className="text-sm text-gray-700 flex-1 pr-2 truncate">{q.question}</div>
                      <div className="text-sm font-semibold text-green-600">{q.count}</div>
                    </div>
                  )) || (
                    <div className="text-sm text-gray-500">No question data available</div>
                  )}
                  {((analytics.popularQuestions?.length || 0) > 3 || (analytics.questionPerformance?.length || 0) > 3) && (
                    <div className="text-center pt-2">
                      <button
                        onClick={() => setActiveTab("questions")}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        View all questions →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Performance Summary and Precision Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Performance Insights</h3>
                  <button
                    onClick={() => setActiveTab("insights")}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    View Details →
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Fastest Model:</div>
                    {sortedModels.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {[...sortedModels].sort((a, b) => a.avg_response_time - b.avg_response_time)[0]?.provider} • 
                          {[...sortedModels].sort((a, b) => a.avg_response_time - b.avg_response_time)[0]?.model_name}
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatTime([...sortedModels].sort((a, b) => a.avg_response_time - b.avg_response_time)[0]?.avg_response_time)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Highest Quality:</div>
                    {sortedModels.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {[...sortedModels].sort((a, b) => b.avg_quality_score - a.avg_quality_score)[0]?.provider} • 
                          {[...sortedModels].sort((a, b) => b.avg_quality_score - a.avg_quality_score)[0]?.model_name}
                        </span>
                        <span className={`text-sm font-semibold ${getQualityColor([...sortedModels].sort((a, b) => b.avg_quality_score - a.avg_quality_score)[0]?.avg_quality_score)}`}>
                          {Math.round([...sortedModels].sort((a, b) => b.avg_quality_score - a.avg_quality_score)[0]?.avg_quality_score)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-2">Most Active Hour:</div>
                    {analytics.activityOverTime && analytics.activityOverTime.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {analytics.activityOverTime.reduce((max, activity) => 
                            activity.count > max.count ? activity : max
                          ).time.slice(-5)} (Today)
                        </span>
                        <span className="text-sm font-semibold text-blue-600">
                          {analytics.activityOverTime.reduce((max, activity) => 
                            activity.count > max.count ? activity : max
                          ).count} chats
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Precision Overview</h3>
                  <button
                    onClick={() => setActiveTab("precision")}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    View Details →
                  </button>
                </div>
                {analytics.precisionMetrics ? (
                  <div className="space-y-4">
                    <div className="text-center p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl">
                      <div className="text-sm text-gray-600">Overall Precision</div>
                      <div className="text-2xl font-bold text-green-600">
                        {(analytics.precisionMetrics.averagePrecision * 100).toFixed(1)}%
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {analytics.precisionMetrics.byCategory.slice(0, 3).map((category, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">{category.category}:</span>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">
                              {(category.precision * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">{category.count} questions</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No precision data available</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "models" && analytics && (
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Model Performance Details</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-gray-300 rounded-xl px-2 py-1 text-sm text-gray-900"
                >
                  <option value="chats">Total Chats</option>
                  <option value="quality">Quality Score</option>
                  <option value="speed">Response Time</option>
                  <option value="cost">Total Cost</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider/Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Tokens
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Context Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Used
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedModels.map((model, index) => (
                    <tr
                      key={`${model.provider}-${model.model_name}`}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{model.provider}</div>
                          <div className="text-sm text-gray-500">{model.model_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {model.total_chats.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(model.avg_response_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${getQualityColor(model.avg_quality_score)}`}>
                          {Math.round(model.avg_quality_score)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Math.round(model.avg_token_count)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Math.round(model.context_usage_rate)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCost(model.cost_estimate_total || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(model.last_chat).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === "insights" && analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popular Questions */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Questions</h2>
              {analytics.popularQuestions.length > 0 ? (
                <div className="space-y-3">
                  {analytics.popularQuestions.slice(0, 10).map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-200"
                    >
                      <div className="flex-1 text-sm text-gray-700 pr-3">{item.question}</div>
                      <div className="text-sm font-medium text-green-600">{item.count}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No popular questions data available</p>
              )}
            </div>

            {/* Performance Charts */}
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Top Performers
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Fastest Response Times</h3>
                  {sortedModels
                    .slice(0, 3)
                    .sort((a, b) => a.avg_response_time - b.avg_response_time)
                    .map((model, index) => (
                      <div key={index} className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-600">
                          {model.provider} • {model.model_name}
                        </span>
                        <span className="font-medium text-green-600">{formatTime(model.avg_response_time)}</span>
                      </div>
                    ))}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Highest Quality Scores</h3>
                  {sortedModels
                    .slice(0, 3)
                    .sort((a, b) => b.avg_quality_score - a.avg_quality_score)
                    .map((model, index) => (
                      <div key={index} className="flex items-center justify-between text-sm py-1">
                        <span className="text-gray-600">
                          {model.provider} • {model.model_name}
                        </span>
                        <span className={`font-medium ${getQualityColor(model.avg_quality_score)}`}>
                          {Math.round(model.avg_quality_score)}%
                        </span>
                      </div>
                    ))}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Most Used Models</h3>
                  {sortedModels.slice(0, 3).map((model, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-600">
                        {model.provider} • {model.model_name}
                      </span>
                      <span className="font-medium text-blue-600">{model.total_chats.toLocaleString()} chats</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions Analytics Tab */}
        {activeTab === "questions" && analytics && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Question Performance Analysis</h2>
              
              {analytics.questionPerformance && analytics.questionPerformance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Question
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Quality
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Response Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Context Usage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.questionPerformance.slice(0, 10).map((question, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                            <div className="truncate">{question.question}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {question.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-medium ${getQualityColor(question.avgQualityScore)}`}>
                              {Math.round(question.avgQualityScore)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTime(question.avgResponseTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {Math.round(question.contextUsageRate)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No question performance data available</p>
              )}
            </div>

            {/* Activity Over Time */}
            {analytics.activityOverTime && (
              <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">User Activity Over Time</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-2xl p-4">
                    <div className="text-sm font-medium text-blue-600">Total Activity</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {analytics.activityOverTime.reduce((sum, activity) => sum + activity.count, 0)}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-2xl p-4">
                    <div className="text-sm font-medium text-green-600">Peak Hour</div>
                    <div className="text-lg font-bold text-green-900">
                      {analytics.activityOverTime.reduce((max, activity) => 
                        activity.count > max.count ? activity : max
                      ).time.slice(-5)}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-2xl p-4">
                    <div className="text-sm font-medium text-purple-600">Avg per Hour</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {Math.round(analytics.activityOverTime.reduce((sum, activity) => sum + activity.count, 0) / analytics.activityOverTime.length)}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Activity chart visualization would go here (requires charting library)
                </div>
              </div>
            )}
          </div>
        )}

        {/* Precision Metrics Tab */}
        {activeTab === "precision" && analytics && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Precision Metrics by Category</h2>
              
              {analytics.precisionMetrics ? (
                <div>
                  {/* Overall Precision */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-600">Overall Average Precision</div>
                      <div className="text-3xl font-bold text-green-600">
                        {analytics.precisionMetrics.averagePrecision.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Category Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analytics.precisionMetrics.byCategory.map((category, index) => (
                      <div key={index} className="bg-gray-50 rounded-2xl p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">{category.category}</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Precision:</span>
                            <span className="font-medium text-green-600">
                              {category.precision.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Recall:</span>
                            <span className="font-medium text-blue-600">
                              {category.recall.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">F1 Score:</span>
                            <span className="font-medium text-purple-600">
                              {category.f1.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Questions:</span>
                            <span className="font-medium text-gray-900">{category.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Precision Explanation */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-2xl">
                    <h3 className="font-semibold text-blue-900 mb-2">Understanding Precision Metrics</h3>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Precision:</strong> How accurate the answers are (quality score based)</p>
                      <p><strong>Recall:</strong> How well the system finds relevant context</p>
                      <p><strong>F1 Score:</strong> Harmonic mean of precision and recall</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No precision metrics data available</p>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-lg">
            <div className="flex items-center justify-center">
              <RefreshCw className="animate-spin h-8 w-8 text-green-600" />
              <span className="ml-3 text-gray-700">Loading analytics...</span>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && !analytics && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center shadow-lg">
            <div className="text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</p>
              <p className="text-gray-600">There's no analytics data available for the selected time range.</p>
              <button
                onClick={fetchAnalytics}
                className="mt-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-xl hover:scale-105 transition-all duration-200 shadow-lg shadow-green-500/25 flex items-center gap-2 mx-auto"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Data
              </button>
            </div>
          </div>
        )}

        {!loading && analytics && analytics.modelStats.length === 0 && (
          <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center shadow-lg">
            <div className="text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No Chat Data</p>
              <p className="text-gray-600">Start using the chat feature to see analytics data here.</p>
            </div>
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  )
}
