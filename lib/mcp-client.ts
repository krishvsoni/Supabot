import { ChatCohere } from "@langchain/cohere";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";

// MCP Standard Response Format
export interface MCPResponse {
  id: string;
  model: string;
  provider: string;
  content: string;
  metadata: {
    responseTime: number;
    tokenCount: number;
    costEstimate: number;
    timestamp: string;
  };
  performance: {
    qualityScore: number;
    coherenceScore: number;
    helpfulnessScore: number;
  };
  error?: string;
}

// MCP Request Format
export interface MCPRequest {
  id: string;
  message: string;
  context?: string;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    useContext?: boolean;
  };
  metadata?: {
    userId?: string;
    sessionId?: string;
    timestamp?: string;
  };
}

// MCP Server Interface
export interface MCPServer {
  name: string;
  displayName: string;
  category: 'fast' | 'balanced' | 'quality';
  maxTokens: number;
  costPerToken: number;
  processRequest(request: MCPRequest): Promise<MCPResponse>;
  isAvailable(): boolean;
}

// Base Server Class
class BaseMCPServer {
  protected estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  protected async calculateQualityScore(question: string, answer: string): Promise<number> {
    let score = 50;
    
    const answerLength = answer.length;
    if (answerLength > 100 && answerLength < 2000) score += 20;
    else if (answerLength > 50) score += 10;

    if (answer.includes('Supabase')) score += 10;
    if (answer.includes('```')) score += 15;
    if (answer.match(/\d+\./g)) score += 10;
    if (answer.match(/\*\s/g)) score += 5;

    if (answer.toLowerCase().includes("i don't know") || 
        answer.toLowerCase().includes("i'm not sure")) {
      score -= 20;
    }

    return Math.max(0, Math.min(100, score));
  }
  
  protected calculateCoherenceScore(answer: string): number {
    let score = 50;
    
    const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length >= 2 && sentences.length <= 10) score += 20;
    
    const flowWords = ['first', 'then', 'next', 'finally', 'however', 'therefore'];
    const hasFlow = flowWords.some(word => answer.toLowerCase().includes(word));
    if (hasFlow) score += 15;
    
    if (answer.includes('\n') || answer.includes('*')) score += 15;
    
    return Math.min(100, Math.max(0, score));
  }
  
  protected calculateHelpfulnessScore(question: string, answer: string): number {
    let score = 50;
    
    const questionWords = question.toLowerCase().split(' ').filter(w => w.length > 3);
    const answerLower = answer.toLowerCase();
    
    const relevantWords = questionWords.filter(word => answerLower.includes(word));
    score += (relevantWords.length / questionWords.length) * 30;
    
    if (answer.includes('step') || answer.match(/\d+\./)) score += 10;
    if (answer.includes('example') || answer.includes('```')) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }
}

// Cohere MCP Server
export class CohereMCPServer extends BaseMCPServer implements MCPServer {
  name = 'cohere';
  displayName = 'Cohere Command';
  category = 'balanced' as const;
  maxTokens = 4096;
  costPerToken = 0.0015;
  
  private client: ChatCohere;
  
  constructor(apiKey: string) {
    super();
    this.client = new ChatCohere({
      apiKey,
      model: "command",
      temperature: 0.1,
    });
  }
  
  async processRequest(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now();
    
    try {
      const systemContent = "You are a Supabase documentation assistant. " + 
        (request.context ? "Use this context to answer questions: " + request.context : "");
      
      const response = await this.client.invoke([
        { role: "system", content: systemContent },
        { role: "user", content: request.message }
      ]);
      
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const responseTime = Date.now() - startTime;
      const tokenCount = this.estimateTokenCount(content);
      
      return {
        id: request.id,
        model: 'command',
        provider: this.name,
        content,
        metadata: {
          responseTime,
          tokenCount,
          costEstimate: tokenCount * this.costPerToken,
          timestamp: new Date().toISOString()
        },
        performance: {
          qualityScore: await this.calculateQualityScore(request.message, content),
          coherenceScore: this.calculateCoherenceScore(content),
          helpfulnessScore: this.calculateHelpfulnessScore(request.message, content)
        }
      };
      
    } catch (error) {
      return {
        id: request.id,
        model: 'command',
        provider: this.name,
        content: '',
        metadata: {
          responseTime: Date.now() - startTime,
          tokenCount: 0,
          costEstimate: 0,
          timestamp: new Date().toISOString()
        },
        performance: {
          qualityScore: 0,
          coherenceScore: 0,
          helpfulnessScore: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  isAvailable(): boolean {
    return !!process.env.NEXT_PUBLIC_COHERE_API_KEY;
  }
}

// Groq MCP Server
export class GroqMCPServer extends BaseMCPServer implements MCPServer {
  name = 'groq';
  displayName: string;
  category: 'fast' | 'balanced' | 'quality';
  maxTokens: number;
  costPerToken = 0;
  
  private client: ChatGroq;
  private modelName: string;
  
  constructor(apiKey: string, model: 'llama3-70b-8192' | 'llama3-8b-8192' | 'mixtral-8x7b-32768') {
    super();
    this.modelName = model;
    this.client = new ChatGroq({
      apiKey,
      model,
      temperature: 0.1,
    });
    
    switch (model) {
      case 'llama3-70b-8192':
        this.displayName = 'Groq LLaMA 3 70B';
        this.category = 'quality';
        this.maxTokens = 8192;
        break;
      case 'llama3-8b-8192':
        this.displayName = 'Groq LLaMA 3 8B';
        this.category = 'fast';
        this.maxTokens = 8192;
        break;
      case 'mixtral-8x7b-32768':
        this.displayName = 'Groq Mixtral 8x7B';
        this.category = 'balanced';
        this.maxTokens = 32768;
        break;
    }
  }
  
  async processRequest(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now();
    
    try {
      const systemContent = "You are a Supabase documentation assistant. " + 
        (request.context ? "Use this context to answer questions: " + request.context : "");
      
      const response = await this.client.invoke([
        { role: "system", content: systemContent },
        { role: "user", content: request.message }
      ]);
      
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const responseTime = Date.now() - startTime;
      const tokenCount = this.estimateTokenCount(content);
      
      return {
        id: request.id,
        model: this.modelName,
        provider: this.name,
        content,
        metadata: {
          responseTime,
          tokenCount,
          costEstimate: 0,
          timestamp: new Date().toISOString()
        },
        performance: {
          qualityScore: await this.calculateQualityScore(request.message, content),
          coherenceScore: this.calculateCoherenceScore(content),
          helpfulnessScore: this.calculateHelpfulnessScore(request.message, content)
        }
      };
      
    } catch (error) {
      return {
        id: request.id,
        model: this.modelName,
        provider: this.name,
        content: '',
        metadata: {
          responseTime: Date.now() - startTime,
          tokenCount: 0,
          costEstimate: 0,
          timestamp: new Date().toISOString()
        },
        performance: {
          qualityScore: 0,
          coherenceScore: 0,
          helpfulnessScore: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  isAvailable(): boolean {
    return !!process.env.NEXT_PUBLIC_GROQ_API_KEY;
  }
}

// OpenRouter MCP Server
export class OpenRouterMCPServer extends BaseMCPServer implements MCPServer {
  name = 'openrouter';
  displayName: string;
  category: 'fast' | 'balanced' | 'quality';
  maxTokens: number;
  costPerToken: number;
  
  private client: ChatOpenAI;
  private modelName: string;
  
  constructor(apiKey: string, model: string = 'openchat/openchat-7b:free') {
    super();
    this.modelName = model;
    this.client = new ChatOpenAI({
      apiKey,
      configuration: {
        baseURL: "https://openrouter.ai/api/v1",
      },
      model,
      temperature: 0.1,
    });
    
    if (model.includes('openchat-7b')) {
      this.displayName = 'OpenChat 7B';
      this.category = 'balanced';
      this.maxTokens = 4096;
      this.costPerToken = 0;
    } else if (model.includes('llama-3.1-70b')) {
      this.displayName = 'LLaMA 3.1 70B';
      this.category = 'quality';
      this.maxTokens = 8192;
      this.costPerToken = 0.0008;
    } else {
      this.displayName = model;
      this.category = 'balanced';
      this.maxTokens = 4096;
      this.costPerToken = 0.001;
    }
  }
  
  async processRequest(request: MCPRequest): Promise<MCPResponse> {
    const startTime = Date.now();
    
    try {
      const systemContent = "You are a Supabase documentation assistant. " + 
        (request.context ? "Use this context to answer questions: " + request.context : "");
      
      const response = await this.client.invoke([
        { role: "system", content: systemContent },
        { role: "user", content: request.message }
      ]);
      
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      const responseTime = Date.now() - startTime;
      const tokenCount = this.estimateTokenCount(content);
      
      return {
        id: request.id,
        model: this.modelName,
        provider: this.name,
        content,
        metadata: {
          responseTime,
          tokenCount,
          costEstimate: tokenCount * this.costPerToken,
          timestamp: new Date().toISOString()
        },
        performance: {
          qualityScore: await this.calculateQualityScore(request.message, content),
          coherenceScore: this.calculateCoherenceScore(content),
          helpfulnessScore: this.calculateHelpfulnessScore(request.message, content)
        }
      };
      
    } catch (error) {
      return {
        id: request.id,
        model: this.modelName,
        provider: this.name,
        content: '',
        metadata: {
          responseTime: Date.now() - startTime,
          tokenCount: 0,
          costEstimate: 0,
          timestamp: new Date().toISOString()
        },
        performance: {
          qualityScore: 0,
          coherenceScore: 0,
          helpfulnessScore: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  isAvailable(): boolean {
    return !!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  }
}

// MCP Client - Orchestrates all MCP servers
export class MCPClient {
  private servers: MCPServer[] = [];
  
  constructor() {
    this.initializeServers();
  }
  
  private initializeServers() {
    if (process.env.NEXT_PUBLIC_GROQ_API_KEY) {
      this.servers.push(
        new GroqMCPServer(process.env.NEXT_PUBLIC_GROQ_API_KEY, 'llama3-70b-8192'),
        new GroqMCPServer(process.env.NEXT_PUBLIC_GROQ_API_KEY, 'llama3-8b-8192'),
        new GroqMCPServer(process.env.NEXT_PUBLIC_GROQ_API_KEY, 'mixtral-8x7b-32768')
      );
    }
    
    if (process.env.NEXT_PUBLIC_COHERE_API_KEY) {
      this.servers.push(new CohereMCPServer(process.env.NEXT_PUBLIC_COHERE_API_KEY));
    }
    
    if (process.env.NEXT_PUBLIC_OPENROUTER_API_KEY) {
      this.servers.push(new OpenRouterMCPServer(process.env.NEXT_PUBLIC_OPENROUTER_API_KEY));
    }
  }
  
  getAvailableServers(): MCPServer[] {
    return this.servers.filter(server => server.isAvailable());
  }
  
  getServer(name: string): MCPServer | undefined {
    return this.servers.find(server => server.name === name);
  }
  
  async sendRequest(serverName: string, request: MCPRequest): Promise<MCPResponse> {
    const server = this.getServer(serverName);
    if (!server) {
      throw new Error(`Server ${serverName} not found or not available`);
    }
    
    return await server.processRequest(request);
  }
  
  async broadcastRequest(request: MCPRequest): Promise<MCPResponse[]> {
    const availableServers = this.getAvailableServers();
    const promises = availableServers.map(server => server.processRequest(request));
    
    const responses = await Promise.allSettled(promises);
    
    return responses.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const server = availableServers[index];
        return {
          id: request.id,
          model: server.displayName,
          provider: server.name,
          content: '',
          metadata: {
            responseTime: -1,
            tokenCount: 0,
            costEstimate: 0,
            timestamp: new Date().toISOString()
          },
          performance: {
            qualityScore: 0,
            coherenceScore: 0,
            helpfulnessScore: 0
          },
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
  }
}
