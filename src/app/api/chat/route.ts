import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
} from "@langchain/core/messages";
import { HuggingFaceChat } from "@/lib/custom-chat-model";

if (!process.env.HUGGINGFACE_API_KEY) {
  throw new Error("Missing HUGGINGFACE_API_KEY environment variable");
}

const model = new HuggingFaceChat({
  model: "google/gemma-2b-it",
  apiKey: process.env.HUGGINGFACE_API_KEY,
  temperature: 0.7,
  maxTokens: 500,
});

// Create a message trimmer to prevent context overflow
const messageTrimmer = trimMessages({
  maxTokens: 2000,
  strategy: "last",
  tokenCounter: (msgs) =>
    msgs.reduce((acc, msg) => acc + msg.content.length, 0),
});

export async function POST(req: Request) {
  try {
    const { message, chatHistory = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
      });
    }

    // Convert chat history to message objects
    const history = chatHistory.map((msg: { role: string; content: string }) =>
      msg.role === "user"
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );

    // Add system message at the start
    const messages = [
      new SystemMessage(
        `You are Gemma, a helpful and knowledgeable AI assistant. Follow these rules:
1. Give direct, clear answers
2. Be concise and to the point
3. Don't add unnecessary pleasantries or questions
4. For math or coding, just show the solution
5. Don't mention that you're an AI or language model
6. Don't ask if there's anything else you can help with
7. Don't use emojis or special characters
8. Format your responses in markdown when appropriate`
      ),
      ...history,
      new HumanMessage(message),
    ];

    // Trim messages to prevent context overflow
    const trimmedMessages = await messageTrimmer.invoke(messages);

    // Set up streaming with proper encoding
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let hasStartedResponse = false;
        try {
          console.log(
            "Starting stream with messages:",
            JSON.stringify(trimmedMessages, null, 2)
          );

          const stream = await model._streamResponseChunks(
            trimmedMessages,
            {
              temperature: 0.7,
              maxTokens: 500,
            },
            undefined
          );

          for await (const chunk of stream) {
            const text = chunk.text;
            if (text?.trim()) {
              hasStartedResponse = true;
              // Format the text to ensure proper newlines
              const formattedText = text
                .replace(/(\d+\.)/g, "\n$1") // Add newline before numbered lists
                .replace(/\n+/g, "\n") // Normalize multiple newlines
                .trim();
              const encodedChunk = encoder.encode(`data: ${formattedText}\n\n`);
              controller.enqueue(encodedChunk);
            } else {
              console.log("Received empty chunk from model");
            }
          }

          if (!hasStartedResponse) {
            console.error("No response was generated from the model");
            // If no response was generated, send an error
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
              ? `Error: ${error.message}\nStack: ${error.stack}`
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
