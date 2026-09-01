export {};

declare global {
  type JsonSchema = Record<string, unknown>;

  interface WebMCPToolAnnotations {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  }

  interface WebMCPTool {
    name: string;
    title?: string;
    description: string;
    inputSchema?: JsonSchema;
    annotations?: WebMCPToolAnnotations;
    execute(input: Record<string, unknown>, options: { signal: AbortSignal }): Promise<unknown>;
  }

  interface WebMCPModelContext {
    registerTool(
      tool: WebMCPTool,
      options?: { signal?: AbortSignal; exposedTo?: string[] },
    ): Promise<void>;
  }

  interface Document {
    modelContext?: WebMCPModelContext;
  }
}
