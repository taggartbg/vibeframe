import * as vscode from 'vscode';
import { McpServerConfig } from '../config/configParser';
import { URL } from 'url';
import { ConnectionManager } from '../communication/connectionManager';

// Interface for messages sent from the WebView
interface WebViewMessage {
  command: string;
  [key: string]: any;
}

// This file will handle creating and managing WebView panels
// Implementation will be added in a future move

export class McpWebview {
  private static panel: vscode.WebviewPanel | undefined;
  private static currentServerConfig: McpServerConfig | undefined;
  private static extensionContext: vscode.ExtensionContext | undefined;
  private static reconnectTimeoutId: NodeJS.Timeout | undefined;
  private static reconnectAttempts = 0;
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;

  /**
   * Create a new WebView panel or show an existing one
   */
  public static createOrShow(context: vscode.ExtensionContext, serverConfig: McpServerConfig): void {
    McpWebview.extensionContext = context;
    McpWebview.currentServerConfig = serverConfig;
    McpWebview.reconnectAttempts = 0;

    const columnToShowIn = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (McpWebview.panel) {
      McpWebview.panel.reveal(columnToShowIn);
      
      // If the server config changed, update the panel
      if (McpWebview.currentServerConfig.serverUrl !== serverConfig.serverUrl) {
        McpWebview.currentServerConfig = serverConfig;
        McpWebview.updateContent(serverConfig);
      }
      
      return;
    }

    // Create panel title from the server config
    const panelTitle = serverConfig.name ? 
      `Vibeframe: ${serverConfig.name}` : 
      `Vibeframe: ${new URL(serverConfig.serverUrl).hostname}`;

    // Otherwise, create a new panel
    McpWebview.panel = vscode.window.createWebviewPanel(
      'vibeframeMcpCanvas',
      panelTitle,
      vscode.ViewColumn.One,
      {
        // Enable JavaScript in the WebView
        enableScripts: true,
        
        // Restrict the WebView to only loading content from specific origins
        localResourceRoots: [],
        
        // Keep the WebView alive when it is not visible
        retainContextWhenHidden: true,
        
        // Allow the WebView to access external resources
        enableFindWidget: true
      }
    );

    // Set initial HTML content
    McpWebview.updateContent(serverConfig);

    // Handle WebView closing
    McpWebview.panel.onDidDispose(
      () => {
        // Clear any pending reconnect timers
        if (McpWebview.reconnectTimeoutId) {
          clearTimeout(McpWebview.reconnectTimeoutId);
          McpWebview.reconnectTimeoutId = undefined;
        }
        McpWebview.panel = undefined;
        McpWebview.reconnectAttempts = 0;
      },
      null,
      context.subscriptions
    );

    // Handle messages from the WebView
    McpWebview.panel.webview.onDidReceiveMessage(
      (message: WebViewMessage) => {
        console.log('Received message from WebView:', message);
        
        switch (message.command) {
          case 'reload':
            McpWebview.reload();
            break;
          case 'error':
            McpWebview.handleConnectionError(message.error);
            break;
          case 'connectionLost':
            McpWebview.handleConnectionLost();
            break;
        }
      },
      undefined,
      context.subscriptions
    );
  }

  /**
   * Update the WebView content with the latest server information
   */
  private static updateContent(serverConfig: McpServerConfig): void {
    if (!McpWebview.panel) {
      return;
    }

    McpWebview.panel.webview.html = McpWebview.getVibeframeHtml(serverConfig);
    
    // Reset reconnect attempts whenever we update content
    McpWebview.reconnectAttempts = 0;
  }

  /**
   * Handle connection errors
   */
  private static handleConnectionError(error?: string): void {
    if (!McpWebview.panel || !McpWebview.currentServerConfig) {
      return;
    }

    vscode.window.showErrorMessage(
      `Failed to connect to MCP server: ${error || 'Unknown error'}`
    );
    
    // Show options to the user
    const retry = 'Retry';
    const selectDifferent = 'Select Different Server';
    
    vscode.window.showErrorMessage(
      `Connection to ${McpWebview.currentServerConfig.serverUrl} failed.`,
      retry,
      selectDifferent
    ).then(selection => {
      if (selection === retry) {
        McpWebview.reload();
      } else if (selection === selectDifferent) {
        // Run the command to open MCP Canvas again, which will trigger server selection
        vscode.commands.executeCommand('vibeframe.openMcpCanvas');
      }
    });
  }

  /**
   * Handle connection lost scenario
   */
  private static handleConnectionLost(): void {
    if (!McpWebview.panel || !McpWebview.currentServerConfig) {
      return;
    }
    
    // Clear any existing reconnect attempt
    if (McpWebview.reconnectTimeoutId) {
      clearTimeout(McpWebview.reconnectTimeoutId);
    }
    
    // If we've exceeded max attempts, ask the user what to do
    if (McpWebview.reconnectAttempts >= McpWebview.MAX_RECONNECT_ATTEMPTS) {
      const retry = 'Retry';
      const selectDifferent = 'Select Different Server';
      
      vscode.window.showErrorMessage(
        `Connection to ${McpWebview.currentServerConfig.serverUrl} was lost and reconnection attempts failed.`,
        retry,
        selectDifferent
      ).then(selection => {
        if (selection === retry) {
          // Reset attempts and try again
          McpWebview.reconnectAttempts = 0;
          McpWebview.reload();
        } else if (selection === selectDifferent) {
          // Run the command to open MCP Canvas again, which will trigger server selection
          vscode.commands.executeCommand('vibeframe.openMcpCanvas');
        }
      });
      
      return;
    }
    
    // Increment attempts and schedule a reconnect with exponential backoff
    McpWebview.reconnectAttempts++;
    const delayMs = Math.min(1000 * Math.pow(2, McpWebview.reconnectAttempts - 1), 30000);
    
    vscode.window.showInformationMessage(
      `Connection lost. Attempting to reconnect in ${delayMs / 1000} seconds...`
    );
    
    McpWebview.reconnectTimeoutId = setTimeout(() => {
      McpWebview.reconnectTimeoutId = undefined;
      McpWebview.reload();
    }, delayMs);
  }

  /**
   * Reload the current WebView
   */
  public static reload(): void {
    if (!McpWebview.panel || !McpWebview.currentServerConfig) {
      return;
    }
    
    // Check if the server is accessible before reloading
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Checking server connection...',
        cancellable: false
      },
      async (progress) => {
        try {
          const isReachable = await ConnectionManager.verifyServerConnection(McpWebview.currentServerConfig!);
          if (isReachable) {
            McpWebview.updateContent(McpWebview.currentServerConfig!);
            return true;
          } else {
            throw new Error('Server is not reachable');
          }
        } catch (error) {
          const retry = 'Retry';
          const selectDifferent = 'Select Different Server';
          
          const selection = await vscode.window.showErrorMessage(
            `Failed to connect to ${McpWebview.currentServerConfig!.serverUrl}. The server may be down.`,
            retry,
            selectDifferent
          );
          
          if (selection === retry) {
            McpWebview.reload();
          } else if (selection === selectDifferent) {
            vscode.commands.executeCommand('vibeframe.openMcpCanvas');
          }
          
          return false;
        }
      }
    );
  }

  /**
   * Generate HTML for the WebView with proper CSP settings
   */
  private static getVibeframeHtml(serverConfig: McpServerConfig): string {
    // Parse server URL to get components
    const serverUrl = new URL(serverConfig.serverUrl);
    const serverOrigin = `${serverUrl.protocol}//${serverUrl.host}`;
    
    // Create CSP directives
    const cspDirectives = [
      // Default policy is to restrict everything
      "default-src 'none'",
      
      // Allow connecting to the MCP server only - updated to support SSE/EventSource
      `connect-src ${serverOrigin} ws://${serverUrl.host} wss://${serverUrl.host} http://${serverUrl.host}/* https://${serverUrl.host}/* ${serverOrigin}/*`,
      
      // Allow scripts, styles, images, and fonts from the MCP server
      `script-src ${serverOrigin} 'unsafe-inline' 'unsafe-eval'`,
      `style-src ${serverOrigin} 'unsafe-inline'`,
      `img-src ${serverOrigin} data: https:`,
      `font-src ${serverOrigin} data:`,
      
      // Allow iframes from the MCP server only
      `frame-src ${serverOrigin}`,
      
      // Allow WebAssembly if needed
      "worker-src blob:",
      
      // Allow self for the WebView
      "frame-ancestors 'self'"
    ];

    const csp = cspDirectives.join('; ');
    
    // The vibeframe endpoint URL
    const vibeframeUrl = new URL('/vibeframe', serverConfig.serverUrl).toString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <title>MCP Canvas</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        
        .loading {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            text-align: center;
            padding: 0 20px;
        }
        
        iframe {
            width: 100%;
            height: 100%;
            border: none;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }
        
        .error {
            color: var(--vscode-errorForeground);
            margin-top: 10px;
            text-align: center;
            max-width: 600px;
        }
        
        .spinner {
            border: 4px solid rgba(0, 0, 0, 0.1);
            border-left-color: var(--vscode-progressBar-background);
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }
        
        button {
            margin-top: 20px;
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 13px;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="loading" class="loading">
        <div class="spinner"></div>
        <h2>Connecting to Vibeframe</h2>
        <p>Loading from ${serverConfig.serverUrl}</p>
    </div>
    
    <iframe id="vibeframe" 
            src="${vibeframeUrl}" 
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
            style="display:none"
            onload="handleFrameLoad()"
            onerror="handleFrameError()">
    </iframe>
    
    <script>
        const vscode = acquireVsCodeApi();
        let pingInterval;
        let connectionLostTimeout;
        
        function handleFrameLoad() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('vibeframe').style.display = 'block';
            
            // Start monitoring connection
            startConnectionMonitoring();
        }
        
        function handleFrameError() {
            const loadingDiv = document.getElementById('loading');
            loadingDiv.innerHTML = '<h2 class="error">Failed to load Vibeframe</h2>' +
                                 '<p class="error">Could not connect to ${serverConfig.serverUrl}</p>' +
                                 '<p>Please check if the server is running and has a valid /vibeframe endpoint.</p>' +
                                 '<button onclick="reloadPage()">Retry Connection</button>';
            
            // Notify extension of the error
            vscode.postMessage({ 
                command: 'error', 
                error: 'Failed to load iframe content'
            });
        }
        
        function reloadPage() {
            vscode.postMessage({ command: 'reload' });
        }
        
        function startConnectionMonitoring() {
            // Check connection status every 10 seconds
            pingInterval = setInterval(() => {
                try {
                    const frame = document.getElementById('vibeframe');
                    
                    // Clear previous timeout if exists
                    if (connectionLostTimeout) {
                        clearTimeout(connectionLostTimeout);
                    }
                    
                    // Set a timeout to detect if we don't get a response
                    connectionLostTimeout = setTimeout(() => {
                        handleConnectionLost();
                    }, 5000);
                    
                    // Try to access the iframe to see if it's still available
                    // This will throw an error if the connection is lost
                    if (frame.contentWindow && frame.contentWindow.location) {
                        // Connection is still good
                        clearTimeout(connectionLostTimeout);
                        connectionLostTimeout = null;
                    }
                } catch (error) {
                    handleConnectionLost();
                }
            }, 10000);
        }
        
        function handleConnectionLost() {
            // Clear intervals to prevent multiple notifications
            clearInterval(pingInterval);
            if (connectionLostTimeout) {
                clearTimeout(connectionLostTimeout);
                connectionLostTimeout = null;
            }
            
            // Show error in WebView
            document.getElementById('vibeframe').style.display = 'none';
            const loadingDiv = document.getElementById('loading');
            loadingDiv.style.display = 'flex';
            loadingDiv.innerHTML = '<h2 class="error">Connection Lost</h2>' +
                                 '<p class="error">The connection to the MCP server was lost.</p>' +
                                 '<div class="spinner"></div>' +
                                 '<p>Attempting to reconnect...</p>' +
                                 '<button onclick="reloadPage()">Retry Now</button>';
            
            // Notify the extension
            vscode.postMessage({ command: 'connectionLost' });
        }
        
        // Set a timeout to show an error if the iframe doesn't load in time
        const loadTimeoutId = setTimeout(() => {
            const frame = document.getElementById('vibeframe');
            if (frame.style.display === 'none') {
                handleFrameError();
            }
        }, 10000);
        
        // Listen for messages from the VS Code extension
        window.addEventListener('message', event => {
            const message = event.data;
            // Handle messages from extension
        });
    </script>
</body>
</html>`;
  }
} 