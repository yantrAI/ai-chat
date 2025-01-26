import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import {
  BaseChatModel,
  BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
} from "@langchain/core/messages";
import { ChatResult, ChatGenerationChunk } from "@langchain/core/outputs";
import { HuggingFaceInference } from "@langchain/community/llms/hf";

export interface HuggingFaceChatCallOptions extends BaseChatModelCallOptions {
  stop?: string[];
}

export interface HuggingFaceChatInput {
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export class HuggingFaceChat extends BaseChatModel<HuggingFaceChatCallOptions> {
  private client: HuggingFaceInference;
  private modelName: string;
  private stopSequences: string[];

  constructor(fields: HuggingFaceChatInput) {
    super({});

    this.modelName = fields.model;
    this.stopSequences = fields.stopSequences ?? [];

    this.client = new HuggingFaceInference({
      model: fields.model,
      apiKey: fields.apiKey,
      temperature: fields.temperature,
      maxTokens: fields.maxTokens,
      stopSequences: this.stopSequences,
    });
  }

  _combinedStopSequences(options?: this["ParsedCallOptions"]): string[] {
    return [...this.stopSequences, ...(options?.stop ?? [])];
  }

  _llmType(): string {
    return "huggingface_chat";
  }

  private _convertMessagesToPrompt(messages: BaseMessage[]): string {
    const messageStrings = messages.map((message) => {
      if (typeof message.content !== "string") {
        throw new Error("Multimodal messages are not supported");
      }
      return `${message._getType()}: ${message.content}`;
    });

    return messageStrings.join("\n");
  }

  private _cleanResponse(text: string, stopSequences: string[]): string {
    let cleaned = text;
    for (const stop of stopSequences) {
      // Create a regex that matches the stop sequence at the end of the text
      const regex = new RegExp(
        `${stop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`
      );
      cleaned = cleaned.replace(regex, "");
    }
    return cleaned;
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const prompt = this._convertMessagesToPrompt(messages);
    const stopSequences = this._combinedStopSequences(options);
    const stream = await this.client.stream(prompt, {
      stop: stopSequences,
    });

    for await (const chunk of stream) {
      if (!chunk) continue;

      const cleanedChunk = this._cleanResponse(chunk, stopSequences);
      if (!cleanedChunk) continue;

      const messageChunk = new AIMessageChunk({
        content: cleanedChunk,
      });
      await runManager?.handleLLMNewToken(cleanedChunk);

      yield new ChatGenerationChunk({
        message: messageChunk,
        text: cleanedChunk,
      });
    }
  }

  async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    try {
      const prompt = this._convertMessagesToPrompt(messages);
      const stopSequences = this._combinedStopSequences(options);
      const response = await this.client.invoke(prompt, {
        stop: stopSequences,
      });

      const cleanedResponse = this._cleanResponse(response, stopSequences);
      const message = new AIMessage(cleanedResponse);

      return {
        generations: [
          {
            message,
            text: cleanedResponse,
          },
        ],
      };
    } catch (error) {
      console.error("Error in generating response:", error);
      throw error;
    }
  }
}
