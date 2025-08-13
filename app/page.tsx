import Link from "next/link"
import { Globe, FileText, Hash, Search, Bot, Zap, BarChart3, Database, Code, Cpu, Network } from "lucide-react"
import { SignInButton, SignUpButton, UserButton, SignedIn, SignedOut } from "@clerk/nextjs"
import { currentUser } from "@clerk/nextjs/server"

export default async function Home() {
  const user = await currentUser()

  return (
    <div className="min-h-screen bg-white">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width%3D%2260%22 height%3D%2260%22 viewBox%3D%220 0 60 60%22 xmlns%3D%22http://www.w3.org/2000/svg%22%3E%3Cg fill%3D%22none%22 fillRule%3D%22evenodd%22%3E%3Cg fill%3D%22%2322c55e%22 fillOpacity%3D%220.05%22%3E%3Ccircle cx%3D%2230%22 cy%3D%2230%22 r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>

      <header className="relative z-10 border-b border-green-100 backdrop-blur-xl bg-white/95">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Supabase AI Docs
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="text-gray-600 hover:text-gray-800 font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105">
                    Get Started
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link href="/chat">
                  <button className="text-gray-600 hover:text-gray-800 font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200">
                    Chat
                  </button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="pt-24 pb-16 text-center">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-green-50 to-green-100 border border-green-200 mb-8">
            <span className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <Cpu className="w-4 h-4 text-green-600" />
              Vectorized Search Query
              <span className="ml-2 text-xs text-green-600 flex items-center"></span>
            </span>
          </div>

          <h1 className="text-6xl lg:text-7xl font-black mb-6 leading-tight">
            {user ? (
              <>
                <span className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent">
                  Welcome back,
                </span>
                <br />
                <span className="bg-gradient-to-r from-green-600 via-green-500 to-green-700 bg-clip-text text-transparent">
                  {user.firstName || "User"}
                </span>
              </>
            ) : (
              <>
                <span className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent">
                 Your AI-Powered
                </span>
                <br />
                <span className="bg-gradient-to-r from-green-600 via-green-500 to-green-700 bg-clip-text text-transparent">
                  Supabase
                </span>
                <br />
                <span className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-600 bg-clip-text text-transparent">
                  Assistant
                </span>
              </>
            )}
          </h1>

          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            {user
              ? "Ready to explore Supabase documentation with AI assistance? Your personalized dashboard awaits."
              : "Get instant answers from Supabase documentation using advanced AI. Search, analyze, and understand complex database concepts with intelligent routing across multiple AI providers."}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="group bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-2xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105">
                  <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Start Free</span>
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link href="/chat">
                <button className="group bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-2xl shadow-green-500/25 hover:shadow-green-500/40 hover:scale-105">
                  <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Start Chat</span>
                </button>
              </Link>
            </SignedIn>
            
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-24">
            <div className="group p-8 rounded-3xl bg-white border border-gray-200 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-all duration-300">
                <Code className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Smart Query Routing</h3>
              <p className="text-gray-600 leading-relaxed">
                Automatically routes queries to the best AI model - OpenAI for SQL, Claude for summaries, Cohere for
                semantic search.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-white border border-gray-200 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-all duration-300">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Performance Analytics</h3>
              <p className="text-gray-600 leading-relaxed">
                Track accuracy, latency, cost, and reliability metrics across all AI providers with detailed logging.
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-white border border-gray-200 hover:border-green-300 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-green-700 to-green-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-all duration-300">
                <Search className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Vector Search</h3>
              <p className="text-gray-600 leading-relaxed">
                Powered by pgvector embeddings for semantic search across the entire Supabase documentation.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-gray-50 to-green-50 border border-gray-200 p-12 mb-20">
            <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Technical Architecture
            </h2>
            <p className="text-gray-600 mb-12 text-lg">From raw documentation to intelligent AI responses</p>
            <p className="text-gray-600 mb-12 text-lg">
              <a
              href="https://github.com/krishvsoni/embedding-local"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1 rounded-lg bg-gray-100 hover:bg-green-100 text-green-700 font-medium transition-colors duration-200"
              >
              <svg
                className="w-5 h-5 mr-1"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                d="M12 2C6.477 2 2 6.484 2 12.012c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.091-.646.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.254-.446-1.274.098-2.656 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.748-1.025 2.748-1.025.546 1.382.202 2.402.1 2.656.64.7 1.028 1.595 1.028 2.688 0 3.847-2.337 4.695-4.566 4.944.359.309.678.919.678 1.852 0 1.336-.012 2.417-.012 2.747 0 .268.18.579.688.481C19.138 20.188 22 16.437 22 12.012 22 6.484 17.523 2 12 2z"
                />
              </svg>
              GitHub Repository Of Pipeline
              </a>
            </p>

            <div className="mb-16">
              <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">Data Processing Pipeline</h3>

              <div className="hidden lg:flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-green-300 via-green-400 to-green-300 transform -translate-y-1/2 z-0">
                  <div className="h-full bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center space-y-3 bg-white p-6 rounded-2xl border border-gray-200 group hover:border-green-300 transition-all duration-300 shadow-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 transition-all duration-300 group-hover:scale-110">
                    <Globe className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm">HTML Scraping</h4>
                  <p className="text-xs text-gray-600 text-center">Raw Supabase docs</p>
                </div>

                <div className="relative z-10 flex flex-col items-center space-y-3 bg-white p-6 rounded-2xl border border-gray-200 group hover:border-green-300 transition-all duration-300 shadow-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-110">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm">Text Cleaning</h4>
                  <p className="text-xs text-gray-600 text-center">Clean structured text</p>
                </div>

                <div className="relative z-10 flex flex-col items-center space-y-3 bg-white p-6 rounded-2xl border border-gray-200 group hover:border-green-300 transition-all duration-300 shadow-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-all duration-300 group-hover:scale-110">
                    <Hash className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm">Vector Embeddings</h4>
                  <p className="text-xs text-gray-600 text-center">1536-dim vectors</p>
                </div>

                <div className="relative z-10 flex flex-col items-center space-y-3 bg-white p-6 rounded-2xl border border-gray-200 group hover:border-green-300 transition-all duration-300 shadow-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/25 group-hover:shadow-yellow-500/40 transition-all duration-300 group-hover:scale-110">
                    <Search className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm">Hybrid Search</h4>
                  <p className="text-xs text-gray-600 text-center">Semantic + keyword</p>
                </div>

                <div className="relative z-10 flex flex-col items-center space-y-3 bg-white p-6 rounded-2xl border border-gray-200 group hover:border-green-300 transition-all duration-300 shadow-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-all duration-300 group-hover:scale-110">
                    <Bot className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm">AI Response</h4>
                  <p className="text-xs text-gray-600 text-center">Contextual answers</p>
                </div>
              </div>

              <div className="lg:hidden space-y-8">
                {[
                  {
                    icon: Globe,
                    title: "HTML Scraping",
                    desc: "Scrape Supabase documentation",
                    color: "from-orange-500 to-red-500",
                  },
                  {
                    icon: FileText,
                    title: "Text Cleaning",
                    desc: "Extract and clean content",
                    color: "from-blue-500 to-purple-500",
                  },
                  {
                    icon: Hash,
                    title: "Vector Embeddings",
                    desc: "Generate 1536-dimensional vectors",
                    color: "from-green-500 to-green-600",
                  },
                  {
                    icon: Search,
                    title: "Hybrid Search",
                    desc: "Semantic + keyword search",
                    color: "from-yellow-500 to-orange-500",
                  },
                  {
                    icon: Bot,
                    title: "AI Response",
                    desc: "Generate contextual answers",
                    color: "from-violet-500 to-purple-500",
                  },
                ].map((step, index) => {
                  const IconComponent = step.icon
                  return (
                    <div key={index} className="flex items-center space-x-6">
                      <div
                        className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center shadow-lg`}
                      >
                        <IconComponent className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-lg">{step.title}</h4>
                        <p className="text-gray-600">{step.desc}</p>
                      </div>
                      {index < 4 && (
                        <div className="w-8 h-0.5 bg-gradient-to-r from-green-400 to-green-500 hidden sm:block"></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="flex items-start space-x-6 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-all duration-300">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg mb-2">Supabase + pgvector</h4>
                    <p className="text-gray-600 leading-relaxed">
                      PostgreSQL with pgvector extension storing 1536-dimensional embeddings for semantic search
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-6 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-all duration-300">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg mb-2">Hybrid Search Engine</h4>
                    <p className="text-gray-600 leading-relaxed">
                      Combines semantic vector search with traditional keyword matching for optimal results
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-6 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-700 to-green-800 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-all duration-300">
                    <Network className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-lg mb-2">Multi-Provider AI</h4>
                    <p className="text-gray-600 leading-relaxed">
                      OpenAI for SQL queries, Claude for summaries, Cohere for embeddings with intelligent routing
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-100 to-green-200 rounded-3xl blur-xl"></div>
                <div className="relative bg-white rounded-3xl p-8 border border-gray-200 shadow-xl">
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-green-500/25">
                      <Cpu className="w-10 h-10 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-800 text-xl">MCP Router</h4>
                    <p className="text-gray-600 leading-relaxed">
                      Model Context Protocol server orchestrating the entire pipeline from query to response
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Supabase AI Docs
              </span>
            </div>
            <p className="text-gray-600 font-mono">Built with love</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
