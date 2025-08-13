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

interface Analytics {
  modelStats: ModelAnalytics[]
  popularQuestions: { question: string; count: number }[]
  totalChats: number
  timeRange: string
  totalCost: number
  avgResponseTime: number
  avgQualityScore: number
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

  // Show loading spinner while authentication is being checked
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
              {["overview", "models", "insights"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab
                      ? "border-green-500 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && analytics && (
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
        )}

        {/* Models Tab */}
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
