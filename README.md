# Vibeframe - MCP UI for VS Code

Create rich visual interfaces for your MCP servers that integrate seamlessly into VS Code, Cursor, and Windsurf.

## Who is this for?
MCP Server (SSE only) developers that want a frontend directly inside users' VSCode-based IDEs.  Simply include instructions to download the Vibeframe VSCode Extension from the Marketplace or include a link to https://vibeframe.dev where they can download the latest relase (Cursor and Windsurf do not support the Marketplace).

All you need to do is implement a `/vibeframe` endpoint from your server and run `Vibeframe: Open MCP Canvas` and you're all set up!

## Features

- **SSE/WS Support**: Two-way communication between your server and the Vibeframe canvas

- **Server Discovery**: Automatically finds MCP servers from:
  - Cursor configuration (global and project-specific)
  - Windsurf configuration
  - VS Code settings and workspace configuration
  - Manual settings in VS Code

- **Project-Specific Priority**: Project/workspace configurations take precedence over global ones

- **Server Verification**: Checks that discovered servers have valid `/vibeframe` endpoints

- **Multiple Server Support**: Select from multiple discovered servers with a simple interface

- **Secure Integration**: Loads the MCP server's web interface in a WebView with proper security policies

- **Connection Monitoring**: Automatically detects connection issues and attempts to reconnect

## Requirements

- VS Code 1.60.0 or higher / Cursor / Windsurf
- A running MCP server with a `/vibeframe` endpoint

## Installation

1. Download the VSIX package from the [releases page](https://github.com/taggartbg/vibeframe/releases)
2. Install it in VS Code by:
   - Running `code --install-extension vibeframe-0.1.0.vsix` in your terminal, or
   - In VS Code, select "Extensions" → click "..." → "Install from VSIX..." → select the downloaded file
3. Install it in Cursor: by:
   - Drag the .vsix file to the Extensions Pane

## Usage

### Opening the MCP Canvas

1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS) to open the Command Palette
2. Type "Vibeframe: Open MCP Canvas" and select it
3. If multiple servers are found, select the one you want to use
4. The MCP interface will load in a VS Code panel

### Server Selection

When multiple MCP servers are detected:

- Verified servers (with confirmed `/vibeframe` endpoints) appear first with a ✓ icon
- Unverified servers show a ⚠️ warning icon
- Select a server from the list to connect to it

### Managing Servers

#### Automatic Discovery

The extension automatically discovers MCP servers from:

- Cursor: 
  - Global: `~/.cursor/mcp.json`
  - Project-specific: `.cursor/mcp.json` (in your workspace)
- Windsurf: `~/.codeium/windsurf/mcp_config.json`
- VS Code: 
  - Workspace: `.vscode/mcp.json` (in your workspace)
  - Settings: VS Code settings UI/JSON

#### Configuration Format

Vibeframe supports multiple configuration formats:

##### Cursor and VS Code format:
```json
{
  "mcpServers": {
    "server1": "https://example-mcp-server.com",
    "server2": {
      "url": "https://another-mcp-server.com",
      "name": "My Custom Server Name",
      "type": "sse"
    }
  }
}
```

##### VS Code workspace format:
```json
{
  "servers": {
    "server1": "https://example-mcp-server.com",
    "server2": {
      "url": "https://another-mcp-server.com",
      "name": "My Custom Server Name",
      "type": "sse"
    }
  }
}
```

##### Windsurf format:
```json
{
  "url": "https://example-mcp-server.com",
  "name": "Optional Server Name"
}
```

#### Manual Configuration

Add your own MCP servers in VS Code settings:

1. Go to Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Vibeframe"
3. Under "Vibeframe: Manual Server Urls", click "Edit in settings.json"
4. Add your servers in the format:
```json
"vibeframe.manualServerUrls": [
  {
    "name": "My MCP Server",
    "url": "https://my-mcp-server.example.com"
  }
]
```

## Configuration Options

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `vibeframe.autoDiscoverServers` | Automatically discover MCP servers from config files | `true` |
| `vibeframe.manualServerUrls` | List of manually configured MCP servers | `[]` |

## Troubleshooting

### Connection Issues

If you encounter connection problems:

1. **Server verification failed** - Check that your MCP server is running and has a `/vibeframe` endpoint
2. **Connection lost** - The extension will automatically attempt to reconnect with exponential backoff
3. **Cannot connect to server** - Ensure your network can reach the MCP server and no firewall is blocking access

### Common Errors

- **No MCP servers found**: Configure a server manually in the settings
- **Failed to load MCP Canvas**: Ensure the server URL is correct and the server is running
- **Connection lost**: Network issue or server went down; the extension will attempt to reconnect

## MCP Server Configuration

For an MCP server to work with this extension, it must:

1. Have a `/vibeframe` endpoint that serves the web interface
2. Allow cross-origin requests from the VS Code WebView

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-org/vibeframe.git
cd vibeframe

# Install dependencies
npm install

# Build the extension
npm run compile

# Package the extension
npm run package
```

### Running and Debugging

1. Open the project in VS Code
2. Press F5 to launch a new VS Code window with the extension loaded
3. Run the "Vibeframe: Open MCP Canvas" command in the new window

## License

Copyright Taggart Bowen-Gaddy

## Credits

Created for seamless integration with MCP-enabled AI coding assistants like Cursor and Windsurf. 
