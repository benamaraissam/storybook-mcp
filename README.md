# storybook-mcp-tools

> ⚠️ **DEPRECATED** - This package is deprecated. Please use **[storybook-mcp-api](https://www.npmjs.com/package/storybook-mcp-api)** instead, which integrates both REST API and MCP protocol in a single unified server.

[![npm version](https://img.shields.io/npm/v/storybook-mcp-tools.svg)](https://www.npmjs.com/package/storybook-mcp-tools)
[![license](https://img.shields.io/npm/l/storybook-mcp-tools.svg)](https://github.com/benamaraissam/storybook-mcp/blob/main/LICENSE)

## Migration

**Switch to the new unified package:**

```bash
npm uninstall storybook-mcp-tools
npm install storybook-mcp-api
```

Then update your usage:
```bash
# Old
npx storybook-mcp-tools

# New
npx storybook-mcp-api
```

The new package provides:
- ✅ All MCP protocol features (same as this package)
- ✅ REST API endpoints for HTTP clients
- ✅ Single unified server on one port
- ✅ Better performance and maintenance
- ✅ Improved SSE and Streamable HTTP support

📦 **[Get storybook-mcp-api](https://www.npmjs.com/package/storybook-mcp-api)** | 🐙 **[GitHub](https://github.com/benamaraissam/storybook-mcp-api)**

---

Expose your Storybook stories via **MCP (Model Context Protocol)** with **SSE** and **HTTP streaming** support. Works with **Storybook 8, 9, and 10**.

📦 **[View on npm](https://www.npmjs.com/package/storybook-mcp-tools)** | 🐙 **[View on GitHub](https://github.com/benamaraissam/storybook-mcp)**

## Features

- 🚀 **MCP Protocol** - Expose Storybook stories via Model Context Protocol
- 📡 **SSE Support** - Server-Sent Events for real-time updates
- 🌊 **HTTP Streaming** - Stream large responses efficiently
- 🔄 **REST API** - Backward compatible REST endpoints
- 🎯 **Multiple Frameworks** - Supports Angular, React, Vue, Svelte, and more
- 📚 **Full Documentation** - Extract component docs, code examples, and usage guides

## Installation

```bash
# Using npx (no installation required)
npx storybook-mcp-tools

# Or install globally
npm install -g storybook-mcp-tools

# Or as a dev dependency
npm install --save-dev storybook-mcp-tools
```

## Quick Start

Navigate to your Storybook project and run:

```bash
npx storybook-mcp-tools
# or shorter alias
npx sb-mcp-tools
```

This will:
1. Start Storybook on an internal port (6010)
2. Start the REST API server on port 6006
3. Start the MCP server on port 8080 (HTTP streaming by default)
4. Proxy Storybook through the same port

Access your services at:
- **Storybook UI**: http://localhost:6006
- **REST API**: http://localhost:6006/api
- **MCP Server**: http://localhost:8080

## CLI Options

```bash
npx storybook-mcp-tools [options]

Options:
  -p, --port <number>          Port for the REST API server (default: 6006)
  -m, --mcp-port <number>      Port for the MCP server (default: 8080)
  -t, --transport <type>       MCP transport: sse or httpStream (default: httpStream)
  -s, --storybook-port <number> Internal Storybook port (default: 6010)
  --no-proxy                    Run API only (requires Storybook running separately)
  --storybook-url <url>         URL of existing Storybook instance
  -d, --dir <path>              Project directory (default: current directory)
  -h, --help                    Display help
```

## MCP Tools

The MCP server exposes the following tools:

### `list_stories`
List all available Storybook stories.

**Parameters:**
- `kind` (optional): Filter stories by kind/category

**Example:**
```json
{
  "tool": "list_stories",
  "arguments": {
    "kind": "Example/Button"
  }
}
```

### `get_story`
Get detailed information about a specific story.

**Parameters:**
- `storyId` (required): The story ID (e.g., "example-button--primary")

**Example:**
```json
{
  "tool": "get_story",
  "arguments": {
    "storyId": "example-button--primary"
  }
}
```

### `get_story_docs`
Get full documentation for a story including code examples.

**Parameters:**
- `storyId` (required): The story ID (e.g., "example-button--docs")

**Example:**
```json
{
  "tool": "get_story_docs",
  "arguments": {
    "storyId": "example-button--docs"
  }
}
```

## MCP Resources

### `storybook://stories`
Resource URI for accessing all Storybook stories.

**MIME Type:** `application/json`

## Transport Types

### HTTP Streaming (Default)
Efficient streaming for large responses:

```bash
npx storybook-mcp-tools --transport httpStream --mcp-port 8080
```

### Server-Sent Events (SSE)
Real-time updates via SSE:

```bash
npx storybook-mcp-tools --transport sse --mcp-port 8080
```

## REST API Endpoints

For backward compatibility, the REST API endpoints are still available:

- `GET /api` - API documentation
- `GET /api/stories` - List all stories
- `GET /api/stories/:storyId` - Get story details
- `GET /api/docs/:storyId` - Get story documentation

## Supported Frameworks

- ✅ Angular (8+)
- ✅ React
- ✅ Vue 3
- ✅ Svelte
- ✅ Web Components

## Supported Storybook Versions

- ✅ Storybook 8
- ✅ Storybook 9
- ✅ Storybook 10

## License

MIT

## Author

issambenamara

