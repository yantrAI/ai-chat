import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import {
  BaseChatModel,
  BaseChatModelCallOptions,
  BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from "@langchain/core/messages";
import { ChatResult, ChatGenerationChunk } from "@langchain/core/outputs";
import { HuggingFaceInference } from "@langchain/community/llms/hf";

interface HuggingFaceChatOptions extends BaseChatModelCallOptions {
  maxTokens?: number;
  temperature?: number;
}

interface HuggingFaceChatParams extends BaseChatModelParams {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class HuggingFaceChat extends BaseChatModel<HuggingFaceChatOptions> {
  private client: HuggingFaceInference;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  static lc_name(): string {
    return "HuggingFaceChat";
  }

  constructor(fields: HuggingFaceChatParams) {
    super(fields);
    this.client = new HuggingFaceInference({
      model: fields.model,
      apiKey: fields.apiKey,
      temperature: fields.temperature ?? 0.7,
      maxTokens: fields.maxTokens ?? 500,
    });
    this.model = fields.model;
    this.temperature = fields.temperature ?? 0.7;
    this.maxTokens = fields.maxTokens ?? 500;
  }

  invocationParams() {
    return {
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    };
  }

  private formatText(text: string): string {
    return text
      .replace(/<eos>/g, "")
      .replace(/<end_of_turn>/g, "")
      .replace(/\[\/INST\]/g, "")
      .replace(/\[INST\]/g, "")
      .replace(/^AI:?\s*/i, "")
      .replace(/^Assistant:?\s*/i, "")
      .replace(/^System:?\s*/i, "")
      .replace(/^Human:?\s*/i, "")
      .replace(/^User:?\s*/i, "")
      .replace(/^Context:?\s*/i, "")
      .replace(/Human:.*$/gm, "")
      .replace(/User:.*$/gm, "")
      .replace(/Assistant:.*$/gm, "")
      .replace(/System:.*$/gm, "")
      .replace(/Context:.*$/gm, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([.!?])(?=\w)/g, "$1 ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private _convertMessagesToPrompt(messages: BaseMessage[]): string {
    const systemMessage = messages.find((m) => m._getType() === "system");
    const userMessage = messages[messages.length - 1];
    const recentHistory = messages
      .slice(-4)
      .filter((m) => m._getType() !== "system")
      .map((m) => m.content)
      .join("\n");

    return `${systemMessage?.content || ""}

Previous conversation:
${recentHistory}

Current question: ${userMessage.content}

Response:`;
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    try {
      const prompt = this._convertMessagesToPrompt(messages);
      const stream = await this.client.stream(prompt, {
        ...options,
      });

      let buffer = "";
      let wordBuffer = "";

      for await (const chunk of stream) {
        if (!chunk) continue;

        // Add to word buffer
        wordBuffer += chunk;

        // If we have a complete word or punctuation
        if (wordBuffer.match(/[.!?,;\s]$/)) {
          const formattedText = this.formatText(wordBuffer);
          wordBuffer = "";

          if (formattedText) {
            buffer += formattedText;

            // Send complete sentences or reasonably sized chunks
            if (buffer.match(/[.!?]\s*$/) || buffer.length > 30) {
              const cleanContent = buffer.trim();
              if (cleanContent) {
                const messageChunk = new AIMessageChunk({
                  content: cleanContent,
                });
                await runManager?.handleLLMNewToken(cleanContent);

                yield new ChatGenerationChunk({
                  message: messageChunk,
                  text: cleanContent,
                });
                buffer = "";
              }
            }
          }
        }
      }

      // Handle any remaining text
      if (wordBuffer || buffer) {
        const finalText = this.formatText(wordBuffer + buffer).trim();
        if (finalText) {
          const messageChunk = new AIMessageChunk({ content: finalText });
          await runManager?.handleLLMNewToken(finalText);

          yield new ChatGenerationChunk({
            message: messageChunk,
            text: finalText,
          });
        }
      }
    } catch (error) {
      console.error("Error in streaming response:", error);
      throw error;
    }
  }

  /** @ignore */
  async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    try {
      await runManager?.handleText("Generating response...");

      const prompt = this._convertMessagesToPrompt(messages);
      const response = await this.client.invoke(prompt, {
        ...options,
      });

      const content = this.formatText(response);
      await runManager?.handleText(content);

      const tokenUsage = {
        completionTokens: content.split(" ").length,
        promptTokens: prompt.split(" ").length,
        totalTokens: content.split(" ").length + prompt.split(" ").length,
      };

      return {
        generations: [{ message: new AIMessage({ content }), text: content }],
        llmOutput: { tokenUsage },
      };
    } catch (error) {
      console.error("Error in HuggingFaceChat:", error);
      throw error;
    }
  }

  _llmType(): string {
    return "huggingface_chat";
  }
}
