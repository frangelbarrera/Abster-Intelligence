/**
 * Minimal MCP (Model Context Protocol) client stub.
 *
 * Goal: let an investigator point Abster at any MCP server (stdio-bridged or
 * HTTP/SSE) and call its tools from the chat. This is intentionally minimal —
 * it does NOT implement the full MCP spec, just the subset needed to:
 *   1. List tools from a configured server URL
 *   2. Invoke a tool by name with a JSON arguments object
 *   3. Surface the result as text (and optionally merge entities into the graph)
 *
 * We do NOT touch the user's existing osint-agent-skills repo (which is a
 * working MCP server). This module is a generic client that can connect to
 * osint-agent-skills OR any other MCP-compatible server.
 *
 * Protocol: we speak JSON-RPC 2.0 over fetch. MCP servers that expose an
 * HTTP endpoint (e.g. via mcp-proxy or a small SSE bridge) will work.
 */

export interface McpServerConfig {
  id: string;
  label: string;
  url: string;
  /** Optional bearer token for authenticated MCP servers. */
  authToken?: string;
  enabled: boolean;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

export interface McpCallResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

let nextRequestId = 1;

async function rpc(server: McpServerConfig, method: string, params: any): Promise<any> {
  const body = {
    jsonrpc: "2.0",
    id: nextRequestId++,
    method,
    params,
  };
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (server.authToken) headers.Authorization = `Bearer ${server.authToken}`;
  const resp = await fetch(server.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`MCP HTTP ${resp.status}: ${await resp.text().catch(() => "")}`);
  const data = await resp.json();
  if (data.error) throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
  return data.result;
}

export async function listTools(server: McpServerConfig): Promise<McpTool[]> {
  const result = await rpc(server, "tools/list", {});
  return (result?.tools || []) as McpTool[];
}

export async function callTool(
  server: McpServerConfig,
  name: string,
  args: Record<string, any>,
): Promise<McpCallResult> {
  const result = await rpc(server, "tools/call", { name, arguments: args });
  return result as McpCallResult;
}

/**
 * Persist MCP server configs in the Abster settings table.
 * The schema is intentionally permissive (Record<string, any>) so we don't
 * need a DB migration to add the new field.
 */
export async function loadMcpServers(): Promise<McpServerConfig[]> {
  const { db } = await import("./db");
  const settings = await db.settings.get("current_user_settings");
  return (settings as any)?.mcpServers || [];
}

export async function saveMcpServers(servers: McpServerConfig[]): Promise<void> {
  const { db } = await import("./db");
  const settings = (await db.settings.get("current_user_settings")) || ({} as any);
  settings.mcpServers = servers;
  await db.settings.put(settings as any);
}
