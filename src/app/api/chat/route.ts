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
  };
};

// Create a chat prompt template following the exact format from the issue
const prompt = ChatPromptTemplate.fromMessages([
  ["system", ""], // Empty system prompt as suggested
  ["human", "<|user|> {message}<|end|>"],
  ["assistant", "<|assistant|>"], // No %2 needed as we're not using template variables for response
]);

export async function POST(req: Request) {
  const controller = new AbortController();
  const { signal } = controller;

  try {
    const { message, modelId = "gemma" } = await req.json();

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

    if (!selectedModel || !selectedModel.config) {
      return new Response(
        JSON.stringify({ error: "Selected model not found or not active" }),
        { status: 400 }
      );
    }

    const model = new HuggingFaceChat({
      model: selectedModel.config.model,
      apiKey: process.env.HUGGINGFACE_API_KEY!,
      temperature: selectedModel.config.temperature,
      maxTokens: Math.min(selectedModel.config.maxTokens, 4096), // Limit tokens as per issue discussion
    });

    // Create the chain by piping the prompt to the model
    const chain = prompt.pipe(model);

    // Set up streaming with proper encoding
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let hasStartedResponse = false;
        try {
          console.log("Starting stream with message:", message);

          const response = await chain.invoke({
            message,
            signal,
            stop: ["<|end|>", "<|user|>", "<|assistant|>", "</s>"], // Stop tokens from the issue
          });

          // Process the response
          if (response) {
            hasStartedResponse = true;
            const content =
              typeof response.content === "string"
                ? response.content
                : Array.isArray(response.content)
                ? response.content
                    .map((c) => (typeof c === "string" ? c : ""))
                    .join(" ")
                : "";

            const formattedText = content
              .replace(/(\d+\.)/g, "\n$1")
              .replace(/\n+/g, "\n")
              .replace(/<\|end\|>/g, "")
              .replace(/<\|user\|>/g, "")
              .replace(/<\|assistant\|>/g, "")
              .replace(/<\/s>/g, "")
              .replace(/\s*<\/s>\s*/g, "")
              .replace(/\s+/g, " ")
              .trim();

            if (formattedText) {
              const encodedChunk = encoder.encode(`data: ${formattedText}\n\n`);
              controller.enqueue(encodedChunk);
            }
          }

          if (!hasStartedResponse) {
            console.error("No response was generated from the model");
            const errorChunk = encoder.encode(
              `data: Error: Model did not generate any response. Please try again.\n\n`
            );
            controller.enqueue(errorChunk);
          }

          // Send end of stream
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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

          const errorChunk = encoder.encode(`data: Error: ${errorMessage}\n\n`);
          controller.enqueue(errorChunk);
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
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
