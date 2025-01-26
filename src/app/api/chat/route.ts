import { HuggingFaceChat } from "@/lib/custom-chat-model";
import { ChatPromptTemplate } from "@langchain/core/prompts";

if (!process.env.HUGGINGFACE_API_KEY) {
  throw new Error("Missing HUGGINGFACE_API_KEY environment variable");
}

type ModelConfig = {
  id: string;
  name: string;
  description: string;
  features: string[];
  active: boolean;
  comingSoon?: boolean;
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
    stopTokens?: string[];
    promptTemplate?: {
      system?: string;
      human: string;
      assistant?: string;
    };
  };
};

export async function POST(req: Request) {
  const controller = new AbortController();
  const { signal } = controller;

  try {
    const { message, chatHistory = [], modelId = "gemma" } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
      });
    }

    // Handle client disconnection
    req.signal.addEventListener("abort", () => {
      controller.abort();
    });

    // Fetch model configuration
    const modelsResponse = await fetch(new URL("/api/models", req.url));
    const models = await modelsResponse.json();
    const selectedModel = models.find(
      (m: ModelConfig) => m.id === modelId && m.active
    );

    if (!selectedModel) {
      return new Response(
        JSON.stringify({ error: "Selected model not found or inactive" }),
        { status: 404 }
      );
    }

    const chat = new HuggingFaceChat({
      model: selectedModel.config.model,
      apiKey: process.env.HUGGINGFACE_API_KEY!,
      temperature: selectedModel.config.temperature,
      maxTokens: selectedModel.config.maxTokens,
      stopSequences: selectedModel.config.stopTokens,
    });

    // Create a model-specific prompt template
    let prompt = "";

    // Add system message if exists
    if (selectedModel.config.promptTemplate?.system) {
      prompt += selectedModel.config.promptTemplate.system + "\n";
    }

    // Add chat history
    if (chatHistory?.length > 0) {
      prompt += "Previous conversation:\n";
      for (const msg of chatHistory) {
        prompt += `${msg.role === "human" ? "Human" : "Assistant"}: ${msg.content}\n`;
      }
    }

    // Add current message with model-specific formatting
    const userPrompt = selectedModel.config.promptTemplate?.human
      ? selectedModel.config.promptTemplate.human.replace("{message}", message)
      : message;

    prompt += userPrompt;

    // Set up streaming with proper encoding
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let hasStartedResponse = false;

        try {
          // Use the streaming API directly with the model
          const stream = await chat.stream(prompt);

          for await (const chunk of stream) {
            hasStartedResponse = true;

            if (chunk.content) {
              // Send chunk as a single SSE message
              controller.enqueue(encoder.encode(`data: ${chunk.content}`));
            }
          }

          if (!hasStartedResponse) {
            console.error("No response was generated from the model");
            const errorChunk = encoder.encode(
              `data: Error: Model did not generate any response. Please try again.`
            );
            controller.enqueue(errorChunk);
          }

          // Send end of stream
          controller.enqueue(encoder.encode(`data: [DONE]`));
          controller.close();
        } catch (error) {
          console.error("Streaming error details:", {
            error,
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          });

          const errorMessage =
            error instanceof Error
              ? error.message === "Request aborted by client"
                ? "Generation stopped by user"
                : `Error: ${error.message}\nStack: ${error.stack}`
              : "Unknown error occurred";

          console.error("Full error context:", errorMessage);

          const errorChunk = encoder.encode(`data: Error: ${errorMessage}`);
          controller.enqueue(errorChunk);
          controller.enqueue(encoder.encode(`data: [DONE]`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process your request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
