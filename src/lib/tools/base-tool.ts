import { z } from "zod";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  func: (args: any) => Promise<any>;
}

export interface ToolCallResult {
  output: string;
  error?: string;
}

export abstract class BaseTool implements ToolDefinition {
  abstract name: string;
  abstract description: string;
  abstract parameters: z.ZodObject<any>;
  abstract func(args: any): Promise<any>;

  async call(args: any): Promise<ToolCallResult> {
    try {
      const validatedArgs = this.parameters.parse(args);
      const output = await this.func(validatedArgs);
      return { output: String(output) };
    } catch (error) {
      return {
        output: "",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
