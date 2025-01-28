import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import {
  BaseChatModel,
  BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  FunctionMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatResult, ChatGenerationChunk } from "@langchain/core/outputs";
import { HuggingFaceInference } from "@langchain/community/llms/hf";
import { BaseTool } from "./tools/base-tool";

export interface HuggingFaceChatCallOptions extends BaseChatModelCallOptions {
  stop?: string[];
  tools?: BaseTool[];
}

export interface HuggingFaceChatInput {
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  tools?: BaseTool[];
}

interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export class HuggingFaceChat extends BaseChatModel<HuggingFaceChatCallOptions> {
  private client: HuggingFaceInference;
  private modelName: string;
  private stopSequences: string[];
  private tools: BaseTool[];

  constructor(fields: HuggingFaceChatInput) {
    super({});

    this.modelName = fields.model;
    this.stopSequences = fields.stopSequences ?? [];
    this.tools = fields.tools ?? [];

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
    let prompt = "";

    // Add tool definitions if available
    if (this.tools.length > 0) {
      prompt += "Available tools:\n";
      this.tools.forEach((tool) => {
        prompt += `\nTool: ${tool.name}\n`;
        prompt += `Description: ${tool.description}\n`;
        prompt += "Parameters:\n";
        const schema = tool.parameters.shape;
        Object.entries(schema).forEach(([key, value]) => {
          const zodValue = value as { _def: { description?: string } };
          prompt += `- ${key}: ${zodValue._def.description || "No description"}\n`;
        });
      });
      prompt +=
        "\nTo use a tool, your response must be in this exact format:\n";
      prompt +=
        'TOOL_CALL: {"name": "tool_name", "arguments": {"arg1": "value1"}}\n';
      prompt += "Example for web search:\n";
      prompt +=
        'TOOL_CALL: {"name": "web_search", "arguments": {"query": "what is the weather", "maxResults": 3}}\n\n';
      prompt += "Important:\n";
      prompt +=
        "1. The response must start with TOOL_CALL: followed by valid JSON\n";
      prompt += "2. The JSON must be properly formatted with double quotes\n";
      prompt +=
        "3. After the tool returns its result, you can continue the conversation normally\n\n";
    }

    // Add messages
    const messageStrings = messages.map((message) => {
      if (message instanceof SystemMessage) {
        return `System: ${message.content}`;
      } else if (message instanceof FunctionMessage) {
        return `Tool '${message.name}' returned: ${message.content}`;
      } else if (typeof message.content !== "string") {
        throw new Error("Multimodal messages are not supported");
      }
      return `${message._getType()}: ${message.content}`;
    });

    prompt += messageStrings.join("\n");
    return prompt;
  }

  private _cleanResponse(text: string, stopSequences: string[]): string {
    let cleaned = text;
    for (const stop of stopSequences) {
      const regex = new RegExp(
        `${stop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`
      );
      cleaned = cleaned.replace(regex, "");
    }
    return cleaned;
  }

  private _parseToolCall(text: string): ToolCall | null {
    // Look for TOOL_CALL: followed by JSON, handling potential malformed JSON
    const toolCallMatch = text.match(/TOOL_CALL:\s*({[\s\S]*})/);
    if (!toolCallMatch) return null;

    try {
      // Clean up the JSON string
      const jsonStr = toolCallMatch[1]
        .trim()
        // Remove any trailing text after the JSON object
        .replace(/}[^}]*$/, "}")
        // Fix common JSON formatting issues
        .replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ':"$1"')
        .replace(/,\s*}/g, "}");

      // Try to parse the cleaned JSON
      const parsed = JSON.parse(jsonStr);

      // Validate the parsed object has required fields
      if (
        typeof parsed.name !== "string" ||
        !parsed.arguments ||
        typeof parsed.arguments !== "object"
      ) {
        console.warn("Invalid tool call format:", parsed);
        return null;
      }

      return {
        name: parsed.name,
        arguments: parsed.arguments,
      };
    } catch (error) {
      console.error("Failed to parse tool call:", error);
      console.error("Raw JSON string:", toolCallMatch[1]);
      return null;
    }
  }

  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const prompt = this._convertMessagesToPrompt(messages);
    console.log("Generated prompt:", prompt);

    const stopSequences = this._combinedStopSequences(options);
    const stream = await this.client.stream(prompt, {
      stop: stopSequences,
    });

    let buffer = "";
    for await (const chunk of stream) {
      if (!chunk) continue;

      const cleanedChunk = this._cleanResponse(chunk, stopSequences);
      if (!cleanedChunk) continue;

      buffer += cleanedChunk;
      console.log("Current buffer:", buffer);

      const toolCall = this._parseToolCall(buffer);
      if (toolCall) {
        console.log("Found tool call:", toolCall);
        // If we found a tool call, execute it
        const tool = this.tools.find((t) => t.name === toolCall.name);
        if (tool) {
          try {
            console.log(
              "Executing tool:",
              tool.name,
              "with args:",
              toolCall.arguments
            );
            const result = await tool.call(toolCall.arguments);
            console.log("Tool result:", result);

            const messageChunk = new AIMessageChunk({
              content: `Tool '${toolCall.name}' result: ${result.output}`,
            });
            if (runManager) {
              await runManager.handleLLMNewToken(
                messageChunk.content as string
              );
            }
            yield new ChatGenerationChunk({
              message: messageChunk,
              text: messageChunk.content as string,
            });
          } catch (error) {
            console.error("Tool execution failed:", error);
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            const messageChunk = new AIMessageChunk({
              content: `Tool '${toolCall.name}' failed: ${errorMessage}`,
            });
            if (runManager) {
              await runManager.handleLLMNewToken(
                messageChunk.content as string
              );
            }
            yield new ChatGenerationChunk({
              message: messageChunk,
              text: messageChunk.content as string,
            });
          }
        } else {
          console.warn("Tool not found:", toolCall.name);
        }
        buffer = ""; // Reset buffer after tool call
      } else {
        const messageChunk = new AIMessageChunk({
          content: cleanedChunk,
        });
        if (runManager) {
          await runManager.handleLLMNewToken(cleanedChunk);
        }
        yield new ChatGenerationChunk({
          message: messageChunk,
          text: cleanedChunk,
        });
      }
    }
  }

  async _generate(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"]
  ): Promise<ChatResult> {
    try {
      const prompt = this._convertMessagesToPrompt(messages);
      const stopSequences = this._combinedStopSequences(options);
      const response = await this.client.invoke(prompt, {
        stop: stopSequences,
      });

      const cleanedResponse = this._cleanResponse(response, stopSequences);
      const toolCall = this._parseToolCall(cleanedResponse);

      if (toolCall) {
        const tool = this.tools.find((t) => t.name === toolCall.name);
        if (tool) {
          try {
            const result = await tool.call(toolCall.arguments);
            const message = new AIMessage(
              `Tool '${toolCall.name}' result: ${result.output}`
            );
            return {
              generations: [
                {
                  message,
                  text: message.content as string,
                },
              ],
            };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            const message = new AIMessage(
              `Tool '${toolCall.name}' failed: ${errorMessage}`
            );
            return {
              generations: [
                {
                  message,
                  text: message.content as string,
                },
              ],
            };
          }
        }
      }

      const message = new AIMessage(cleanedResponse);
      return {
        generations: [
          {
            message,
            text: message.content as string,
          },
        ],
      };
    } catch (error) {
      console.error("Error in generating response:", error);
      throw error;
    }
  }
}
