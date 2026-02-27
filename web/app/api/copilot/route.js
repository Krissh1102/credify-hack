import { 
  CopilotRuntime, 
  GoogleGenerativeAIAdapter, 
  copilotRuntimeNextJSAppRouterEndpoint 
} from "@copilotkit/runtime";

export const POST = async (req) => {
  const runtime = new CopilotRuntime();
  
  // Use Gemini 3 Flash for fast, cheap processing
  const serviceAdapter = new GoogleGenerativeAIAdapter({ 
    model: "gemini-3-flash-preview" 
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilot",
  });

  return handleRequest(req);
};