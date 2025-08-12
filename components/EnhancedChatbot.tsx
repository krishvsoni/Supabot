"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Send, Loader2, MessageCircle, Settings, Trash2, Zap, Scale, Target, Bot } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface ChatMessage {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  model?: string
  provider?: string
  responseTime?: number
  context?: string
  contextDocs?: number
  qualityScore?: number
}

interface LLMProvider {
  name: string
  displayName: string
  category: "fast" | "balanced" | "quality"
  description: string
}

export default function SimpleChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [useContext, setUseContext] = useState(true)
  const [selectedProvider, setSelectedProvider] = useState<string>("auto")
  const [availableProviders, setAvailableProviders] = useState<LLMProvider[]>([])
  const [showProviderDetails, setShowProviderDetails] = useState(false)

  useEffect(() => {
    // Fetch available providers
    fetchAvailableProviders()
  }, [])

  const fetchAvailableProviders = async () => {
    try {
      const response = await fetch("/api/chat/providers")
      const data = await response.json()
      if (data.success) {
        setAvailableProviders(data.providers)
      }
    } catch (error) {
      console.error("Error fetching providers:", error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          useContext,
          selectedProvider: selectedProvider === "auto" ? undefined : selectedProvider,
        }),
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          role: "assistant",
          timestamp: new Date(),
          model: data.model,
          provider: data.provider,
          responseTime: data.responseTime,
          context: data.context,
          contextDocs: data.contextDocs,
          qualityScore: data.qualityScore,
        }

        setMessages((prev) => [...prev, assistantMessage])
      } else {
        throw new Error(data.error || "Failed to get response")
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "fast":
        return "text-green-600 bg-green-50"
      case "balanced":
        return "text-blue-600 bg-blue-50"
      case "quality":
        return "text-purple-600 bg-purple-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "fast":
        return <Zap className="w-4 h-4" />
      case "balanced":
        return <Scale className="w-4 h-4" />
      case "quality":
        return <Target className="w-4 h-4" />
      default:
        return <Bot className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-[700px] flex flex-col bg-white rounded-3xl border border-gray-200 shadow-2xl">
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Supabase AI Assistant</h2>
            <p className="text-gray-600">Enhanced with semantic search & multi-provider support</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowProviderDetails(!showProviderDetails)}
              className="text-sm text-green-600 hover:text-green-700 px-3 py-2 rounded-xl border border-green-200 hover:bg-green-50 transition-all duration-200 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {showProviderDetails ? "Hide" : "Show"} Providers
            </button>
            <button
              onClick={clearChat}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Chat
            </button>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Provider:</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="text-sm bg-white border border-gray-300 rounded-xl px-3 py-2 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="auto">Auto (Best Available)</option>
              {availableProviders.map((provider) => (
                <option key={provider.name} value={provider.name}>
                  {provider.displayName}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={useContext}
              onChange={(e) => setUseContext(e.target.checked)}
              className="rounded border-gray-300 bg-white text-green-600 focus:ring-green-500"
            />
            <span className="text-gray-700">Use documentation context</span>
          </label>
        </div>

        {/* Provider Details */}
        {showProviderDetails && (
          <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Available Providers:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableProviders.map((provider) => (
                <div key={provider.name} className="flex items-center space-x-2 text-xs">
                  <span
                    className={`px-2 py-1 rounded-lg flex items-center gap-1 ${getCategoryColor(provider.category)}`}
                  >
                    {getCategoryIcon(provider.category)}
                    {provider.category.toUpperCase()}
                  </span>
                  <span className="font-medium text-gray-900">{provider.displayName}</span>
                  <span className="text-gray-600">- {provider.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            <div className="mb-4">
              <MessageCircle className="mx-auto h-12 w-12 text-green-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Enhanced Supabase AI Assistant</h3>
            <p className="text-gray-600 mb-4">
              Ask me anything about Supabase documentation with improved semantic search!
            </p>
            <div className="text-sm text-gray-500 space-y-1">
            
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${message.role === "user" ? "order-2" : "order-1"}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25"
                      : "bg-gray-50 border border-gray-200 text-gray-900"
                  }`}
                >
                  {message.role === "user" ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-900 prose-headings:text-gray-900 prose-p:text-gray-900 prose-strong:text-gray-900 prose-code:text-gray-900 prose-pre:bg-gray-100 prose-pre:text-gray-900">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                <div
                  className={`mt-2 text-xs text-gray-500 flex items-center gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <>
                      <span className="font-medium text-green-600">{message.model}</span>
                      <span>•</span>
                      <span>{message.responseTime}ms</span>
                      {message.qualityScore && (
                        <>
                          <span>•</span>
                          <span
                            className={`px-2 py-1 rounded-lg text-xs ${
                              message.qualityScore >= 80
                                ? "bg-green-100 text-green-700"
                                : message.qualityScore >= 60
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            Q: {message.qualityScore}%
                          </span>
                        </>
                      )}
                      {message.contextDocs && message.contextDocs > 0 && (
                        <>
                          <span>•</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs">
                            {message.contextDocs} docs
                          </span>
                        </>
                      )}
                    </>
                  )}
                  <span>{message.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 max-w-[80%]">
              <div className="flex items-center space-x-3">
                <Loader2 className="animate-spin h-4 w-4 text-green-600" />
                <span className="text-gray-700">
                  {selectedProvider === "auto"
                    ? "Thinking..."
                    : `Asking ${availableProviders.find((p) => p.name === selectedProvider)?.displayName || selectedProvider}...`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-6">
        <div className="flex space-x-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about Supabase documentation..."
            disabled={loading}
            className="flex-1 resize-none bg-white border border-gray-300 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
            style={{ minHeight: "48px", maxHeight: "120px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "48px"
              target.style.height = Math.min(target.scrollHeight, 120) + "px"
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105 disabled:hover:scale-100 disabled:shadow-none"
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="w-4 h-4" />}
            <span>{loading ? "Sending..." : "Send"}</span>
          </button>
        </div>

        {selectedProvider !== "auto" && (
          <div className="mt-3 text-xs text-gray-500 text-center">
            Using:{" "}
            <span className="text-green-600">
              {availableProviders.find((p) => p.name === selectedProvider)?.displayName || selectedProvider}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
