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
      maxTokens: Math.min(selectedModel.config.maxTokens, 2048),
    });

    // Create a model-specific prompt template
    const messages: [string, string][] = [];
    if (selectedModel.config.promptTemplate?.system) {
      messages.push(["system", selectedModel.config.promptTemplate.system]);
    }
    messages.push([
      "human",
      selectedModel.config.promptTemplate?.human || "{message}",
    ]);
    if (selectedModel.config.promptTemplate?.assistant) {
      messages.push([
        "assistant",
        selectedModel.config.promptTemplate.assistant,
      ]);
    }

    const prompt = ChatPromptTemplate.fromMessages(messages);
    const chain = prompt.pipe(model);

    // Set up streaming with proper encoding
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let hasStartedResponse = false;
        let tokenCount = 0;
        const MAX_TOKENS = 2048;

        try {
          console.log("Starting stream with message:", message);

          const response = await chain.invoke({
            message,
            signal,
            stop: selectedModel.config.stopTokens || ["</s>"],
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

            // Count approximate tokens
            tokenCount = content.split(/\s+/).length;

            // Only process if within token limit
            if (tokenCount <= MAX_TOKENS) {
              const formattedText = content
                .replace(/(\d+\.)/g, "\n$1")
                .replace(/\n+/g, "\n")
                .replace(/<\|system\|>.*?<\|end\|>/g, "")
                .replace(/<\|user\|>.*?<\|end\|>/g, "")
                .replace(/<\|assistant\|>/g, "")
                .replace(/<\|end\|>/g, "")
                .replace(/<\/s>/g, "")
                .replace(/\s*<\/s>\s*/g, "")
                .replace(/\s+/g, " ")
                .trim();

              if (formattedText) {
                const encodedChunk = encoder.encode(
                  `data: ${formattedText}\n\n`
                );
                controller.enqueue(encodedChunk);
              }
            } else {
              console.warn("Response exceeded token limit");
              const errorChunk = encoder.encode(
                `data: Response exceeded maximum length.\n\n`
              );
              controller.enqueue(errorChunk);
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
