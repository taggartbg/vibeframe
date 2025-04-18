import * as vscode from 'vscode';
import { ConfigParser } from './config/configParser';
import { McpWebview } from './webview/mcpWebview';
import { McpServerConfig } from './config/configParser';

export function activate(context: vscode.ExtensionContext) {
  console.log('Vibeframe extension is now active!');

  // Register the command to open MCP Canvas
  const disposable = vscode.commands.registerCommand('vibeframe.openMcpCanvas', async () => {
    await openMcpCanvas(context);
  });

  context.subscriptions.push(disposable);
}

async function openMcpCanvas(context: vscode.ExtensionContext): Promise<void> {
  vscode.window.showInformationMessage('Opening MCP Canvas...');
  
  try {
    // Get configuration
    const config = vscode.workspace.getConfiguration('vibeframe');
    const autoDiscover = config.get<boolean>('autoDiscoverServers', true);
    const manualServers = config.get<Array<{name: string, url: string}>>('manualServerUrls', []);
    
    let servers: McpServerConfig[] = [];
    
    // Add manual servers
    if (manualServers.length > 0) {
      servers = manualServers.map(server => ({
        serverUrl: server.url,
        name: server.name || 'VS Code MCP',
        source: 'VS Code'
      }));
    }
    
    // Add auto-discovered servers
    if (autoDiscover) {
      const discoveredServers = await ConfigParser.discoverMcpServers();
      servers = [...servers, ...discoveredServers];
    }
    
    if (servers.length === 0) {
      vscode.window.showErrorMessage('No MCP servers found. Please check your configuration.');
      return;
    }
    
    // Sort servers to show verified ones first
    servers.sort((a, b) => {
      // If one is verified and the other isn't, put the verified one first
      if (a.isVerified !== b.isVerified) {
        return (a.isVerified === true) ? -1 : 1;
      }
      // Otherwise, sort alphabetically by name
      return (a.name || a.serverUrl).localeCompare(b.name || b.serverUrl);
    });
    
    // If only one server is found, use it directly
    if (servers.length === 1) {
      const server = servers[0];
      if (server.isVerified === false) {
        const proceed = await confirmUseUnverifiedServer(server);
        if (!proceed) {
          return;
        }
      }
      
      McpWebview.createOrShow(context, server);
      return;
    }
    
    // If multiple servers are found, show a selection interface
    const selectedServer = await selectMcpServer(servers);
    if (!selectedServer) {
      // User cancelled the selection
      return;
    }
    
    // Check if the selected server is verified
    if (selectedServer.isVerified === false) {
      const proceed = await confirmUseUnverifiedServer(selectedServer);
      if (!proceed) {
        return;
      }
    }
    
    McpWebview.createOrShow(context, selectedServer);
  } catch (error) {
    vscode.window.showErrorMessage(`Error opening MCP Canvas: ${error}`);
  }
}

/**
 * Create a QuickPick interface for selecting an MCP server
 */
async function selectMcpServer(servers: McpServerConfig[]): Promise<McpServerConfig | undefined> {
  const items: vscode.QuickPickItem[] = servers.map(server => {
    // Create a label with verification status indicator
    const verificationIndicator = server.isVerified === true 
      ? '$(check) ' 
      : server.isVerified === false 
        ? '$(warning) ' 
        : '$(question) ';
        
    const name = server.name || new URL(server.serverUrl).hostname;
    
    return {
      label: `${verificationIndicator}${name}`,
      description: server.serverUrl,
      detail: server.source ? `Source: ${server.source}${server.isVerified === false ? ' (Unverified)' : ''}` : '',
    };
  });
  
  const quickPick = vscode.window.createQuickPick();
  quickPick.items = items;
  quickPick.title = 'Select MCP Server';
  quickPick.placeholder = 'Choose a server to connect to...';
  quickPick.canSelectMany = false;
  
  return new Promise<McpServerConfig | undefined>((resolve) => {
    quickPick.onDidAccept(() => {
      const selection = quickPick.selectedItems[0];
      quickPick.hide();
      
      if (!selection) {
        resolve(undefined);
        return;
      }
      
      // Find the corresponding server config from the description (URL)
      const selectedServer = servers.find(server => 
        server.serverUrl === selection.description
      );
      
      resolve(selectedServer);
    });
    
    quickPick.onDidHide(() => {
      quickPick.dispose();
      resolve(undefined);
    });
    
    quickPick.show();
  });
}

// Helper function to confirm using an unverified server
async function confirmUseUnverifiedServer(server: McpServerConfig): Promise<boolean> {
  const message = `The MCP server at ${server.serverUrl} could not be verified to have a valid /vibeframe endpoint. Use it anyway?`;
  const useAnyway = 'Use Anyway';
  const cancel = 'Cancel';
  
  const choice = await vscode.window.showWarningMessage(message, useAnyway, cancel);
  return choice === useAnyway;
}

export function deactivate() {
  // Clean up resources when the extension is deactivated
} 