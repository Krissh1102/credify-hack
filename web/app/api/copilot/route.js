import { 
  CopilotRuntime, 
  OpenAIAdapter, 
  copilotRuntimeNextJSAppRouterEndpoint 
} from "@copilotkit/runtime";
import OpenAI from "openai";

const groq = new OpenAI({ 
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

export const POST = async (req) => {
  const runtime = new CopilotRuntime();
  
  const serviceAdapter = new OpenAIAdapter({ 
    openai: groq,
    model: "llama3-8b-8192"
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilot",
  });

  return handleRequest(req);
};