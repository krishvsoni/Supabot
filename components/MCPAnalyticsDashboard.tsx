"use client"

import { useState, useEffect, useCallback } from "react"
import { TrendingUp, DollarSign, Star, Users, Database, Activity, AlertTriangle } from "lucide-react"

interface DatabaseTable {
  name: string
  rowCount: number
  status: 'healthy' | 'warning' | 'error'
  lastUpdated: string
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

export default function MCPAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<MCPAnalytics | null>(null)
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseTable[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTimeRange, setActiveTimeRange] = useState('24h')

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/analytics/mcp?timeRange=${activeTimeRange}`)
      const data = await response.json()
      if (data.success) {
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Error fetching MCP analytics:", error)
    } finally {
      setLoading(false)
    }
  }, [activeTimeRange])

  useEffect(() => {
    fetchAnalytics()
    checkDatabaseStatus()
  }, [fetchAnalytics])

  const checkDatabaseStatus = async () => {
    try {
      // Check each table that was previously empty
      const tables = [
        'benchmark_sessions',
        'llm_evaluations', 
        'llm_provider_stats',
        'recent_evaluations'
      ]

      const tableStatus: DatabaseTable[] = []

      for (const tableName of tables) {
        try {
          const response = await fetch(`/api/database/check?table=${tableName}`)
          const data = await response.json()
          
          tableStatus.push({
            name: tableName,
            rowCount: data.rowCount || 0,
            status: data.rowCount > 0 ? 'healthy' : 'warning',
            lastUpdated: data.lastUpdated || new Date().toISOString()
          })
        } catch (error) {
          console.error(`Error checking table ${tableName}:`, error)
          tableStatus.push({
            name: tableName,
            rowCount: 0,
            status: 'error',
            lastUpdated: new Date().toISOString()
          })
        }
      }

      setDatabaseStatus(tableStatus)
    } catch (error) {
      console.error("Error checking database status:", error)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await Promise.all([fetchAnalytics(), checkDatabaseStatus()])
    setRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'groq': return 'bg-green-500'
      case 'cohere': return 'bg-blue-500'
      case 'openrouter': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading MCP Analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">MCP Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Model Context Protocol Analytics & Database Monitoring
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={activeTimeRange}
              onChange={(e) => setActiveTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Database Status Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          {databaseStatus.map((table) => (
            <div key={table.name} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 capitalize">
                    {table.name.replace('_', ' ')}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {table.rowCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Records</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(table.status).split(' ')[1]}`}></div>
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(table.status)}`}>
                  {table.status === 'healthy' ? 'Active' : table.status === 'warning' ? 'Empty' : 'Error'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {analytics && (
          <>
            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(analytics?.analytics?.costAnalysis?.totalCost || 0).toFixed(4)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Avg: ${(analytics?.analytics?.costAnalysis?.avgCostPerRequest || 0).toFixed(4)} per request
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Star className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Quality Score</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics?.analytics?.qualityMetrics?.overallQualityScore || 0}%
                    </p>
                    <p className="text-xs text-gray-500">Overall quality</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Total Sessions</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics?.analytics?.sessionHistory?.length || 0}
                    </p>
                    <p className="text-xs text-gray-500">Benchmark sessions</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-500">Projected Monthly</h3>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(analytics?.analytics?.costAnalysis?.projectedMonthlyCost || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Estimated cost</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Performance */}
            {(analytics?.analytics?.providerStats?.length || 0) > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Provider Performance</h3>
                <div className="space-y-4">
                  {analytics.analytics.providerStats.map((provider, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-4 h-4 rounded-full ${getProviderColor(provider?.provider || '')}`}></div>
                        <div>
                          <h4 className="font-medium">{provider?.provider || 'Unknown'}</h4>
                          <p className="text-sm text-gray-500">{provider?.modelName || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-8 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{provider?.totalRequests || 0}</div>
                          <div className="text-gray-500">Requests</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{provider?.avgResponseTime || 0}ms</div>
                          <div className="text-gray-500">Avg Time</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{provider?.avgQualityScore || 0}%</div>
                          <div className="text-gray-500">Quality</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{((provider?.successRate || 0) * 100).toFixed(1)}%</div>
                          <div className="text-gray-500">Success</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">${(provider?.totalCost || 0).toFixed(4)}</div>
                          <div className="text-gray-500">Cost</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            {(analytics?.analytics?.costAnalysis?.costByProvider?.length || 0) > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Cost Breakdown by Provider</h3>
                <div className="space-y-3">
                  {analytics.analytics.costAnalysis.costByProvider.map((provider, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getProviderColor(provider?.provider || '')}`}></div>
                        <span className="font-medium capitalize">{provider?.provider || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getProviderColor(provider?.provider || '')}`}
                            style={{ width: `${provider?.percentage || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-16 text-right">
                          ${(provider?.cost || 0).toFixed(4)}
                        </span>
                        <span className="text-sm text-gray-500 w-12 text-right">
                          {(provider?.percentage || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improvement Suggestions */}
            {(analytics?.analytics?.qualityMetrics?.improvementSuggestions?.length || 0) > 0 && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mr-2" />
                  Improvement Suggestions
                </h3>
                <div className="space-y-2">
                  {analytics.analytics.qualityMetrics.improvementSuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                      <div className="w-2 h-2 bg-orange-400 rounded-full mt-2"></div>
                      <p className="text-sm text-gray-700">{suggestion || 'No suggestion available'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sessions */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
              {(analytics?.analytics?.sessionHistory?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {analytics.analytics.sessionHistory.slice(0, 5).map((session) => (
                    <div key={session?.sessionId || `session-${Math.random()}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="font-medium">{session?.sessionName || 'Unnamed Session'}</h4>
                        <p className="text-sm text-gray-500">
                          {session?.questionCount || 0} questions • {session?.providerCount || 0} providers
                        </p>
                      </div>
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium">{session?.avgQualityScore || 0}%</div>
                          <div className="text-gray-500">Quality</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">${(session?.totalCost || 0).toFixed(4)}</div>
                          <div className="text-gray-500">Cost</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">
                            {session?.completedAt ? new Date(session.completedAt).toLocaleDateString() : 'Unknown'}
                          </div>
                          <div className="text-gray-500">
                            {session?.completedAt ? new Date(session.completedAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            }) : 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No sessions found</p>
                  <p className="text-sm">Run some benchmarks to see data here</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
