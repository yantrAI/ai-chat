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

export interface HuggingFaceChatOptions extends BaseChatModelCallOptions {
  stop?: string[];
}

export interface HuggingFaceChatParams extends BaseChatModelParams {
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
}

export class HuggingFaceChat extends BaseChatModel<HuggingFaceChatOptions> {
  private client: HuggingFaceInference;
  private model: string;
  private apiKey: string;
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
      maxTokens: fields.maxTokens ?? 1024,
    });
    this.model = fields.model;
    this.apiKey = fields.apiKey;
    this.temperature = fields.temperature ?? 0.7;
    this.maxTokens = fields.maxTokens ?? 1024;
  }

  invocationParams(options?: this["ParsedCallOptions"]) {
    return {
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      stop: options?.stop,
    };
  }

  private formatText(text: string): string {
    // Only remove stop words, keep everything else exactly as is
    return text
      .replace(/<eos>/g, "")
      .replace(/<end_of_turn>/g, "")
      .replace(/\s*<\/s>\s*/g, "")
      .replace(/<\|im_end\|>/g, "")
      .replace(/<\|endoftext\|>/g, "")
      .replace(/<\|end_of_text\|>/g, "")
      .replace(/<\|begin_of_text\|>/g, "")
      .replace(/<\|begin_of_text\|>:\/\/>/g, "");
  }

  private _convertMessagesToPrompt(messages: BaseMessage[]): string {
    const systemMessage = messages.find((m) => m._getType() === "system");
    const userMessage = messages[messages.length - 1];
    const recentHistory = messages
      .slice(-4)
      .filter((m) => m._getType() !== "system")
      .map((m) => m.content);

    // Join messages without adding extra newlines
    return `${systemMessage?.content || ""}Previous conversation:${recentHistory.join("")}Current question:${userMessage.content}Response:`;
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

      for await (const chunk of stream) {
        if (!chunk) continue;
        
        console.log("Raw model chunk (with escaped newlines):", JSON.stringify(chunk));
        console.log("Raw content (with escaped newlines):", JSON.stringify(chunk.content));
        
        // Just remove stop words and send immediately
        const rawText = this.formatText(chunk);
        
        console.log("After stop words removal:", JSON.stringify(rawText));
        
        if (rawText) {
          const messageChunk = new AIMessageChunk({
            content: rawText,
          });
          await runManager?.handleLLMNewToken(rawText);

          yield new ChatGenerationChunk({
            message: messageChunk,
            text: rawText,
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
    const params = this.invocationParams(options);
    const messageStrings = messages.map((message) => {
      if (typeof message.content !== "string") {
        throw new Error("Multimodal messages are not supported");
      }
      return `${message._getType()}: ${message.content}`;
    });

    const response = await fetch(
      "https://api-inference.huggingface.co/models/" + this.model,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          inputs: messageStrings.join(""),
          parameters: {
            temperature: params.temperature,
            max_new_tokens: params.maxTokens,
            return_full_text: false,
            stop: params.stop,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const content = result[0]?.generated_text ?? "";

    await runManager?.handleLLMNewToken(content);

    return {
      generations: [
        {
          message: new AIMessage({ content }),
          text: content,
        },
      ],
      llmOutput: {
        tokenUsage: {
          completionTokens: content.split(" ").length,
          promptTokens: messageStrings.join("").split(" ").length,
          totalTokens:
            content.split(" ").length +
            messageStrings.join("").split(" ").length,
        },
      },
    };
  }

  _llmType(): string {
    return "huggingface_chat";
  }
}
