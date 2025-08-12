import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import SimpleChatbot from "../../components/SimpleChatbot"
import SimpleEvaluator from "../../components/SimpleEvaluator"

export default async function Dashboard() {
  const user = await currentUser()

  if (!user) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <span className="text-xl font-semibold text-gray-900">Supabase AI Docs</span>
                <div className="text-xs text-gray-500">Powered by Groq • Cohere • OpenRouter</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {user.firstName || user.username || 'User'}!
              </div>
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Chat Section */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Documentation Assistant</h1>
              <p className="text-gray-600">
                Chat with AI powered by your Supabase documentation. Get instant answers from multiple LLM providers.
              </p>
            </div>
            <SimpleChatbot />
          </div>

          {/* Evaluation Section */}
          <div className="space-y-6">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">LLM Evaluation & Benchmarking</h1>
              <p className="text-gray-600">
                Compare performance across free LLM providers. Test individual questions or run comprehensive benchmarks.
              </p>
            </div>
            <SimpleEvaluator />
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Free LLM Providers</h3>
            <p className="text-sm text-gray-600">
              Compare responses from Groq (ultra-fast), Cohere (structured), and OpenRouter (diverse models) - all free!
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Metrics</h3>
            <p className="text-sm text-gray-600">
              Track response time, quality scores, and costs. Find the best performing model for your use case.
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Context</h3>
            <p className="text-sm text-gray-600">
              Automatically includes relevant documentation context from your Supabase knowledge base for accurate answers.
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">3</div>
              <div className="text-sm text-gray-600">LLM Providers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-gray-600">Free Tier</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">~500ms</div>
              <div className="text-sm text-gray-600">Avg Response</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">∞</div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
