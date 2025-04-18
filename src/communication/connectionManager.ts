import * as vscode from 'vscode';
import { McpServerConfig } from '../config/configParser';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

// This file will handle verification of MCP server connectivity
// But the actual communication will be handled by the embedded frontend

export class ConnectionManager {
  private serverConfig: McpServerConfig;

  constructor(serverConfig: McpServerConfig) {
    this.serverConfig = serverConfig;
  }

  // Verify that the MCP server is accessible and has a valid /vibeframe endpoint
  public static async verifyServerConnection(serverConfig: McpServerConfig): Promise<boolean> {
    try {
      const vibeframeUrl = new URL('/vibeframe', serverConfig.serverUrl);
      const result = await this.checkEndpoint(vibeframeUrl.toString());
      return result;
    } catch (error) {
      console.error(`Failed to verify server ${serverConfig.serverUrl}:`, error);
      return false;
    }
  }

  // Check if an endpoint exists and returns a 200 status code
  private static checkEndpoint(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const isHttps = url.startsWith('https:');
      const requestLib = isHttps ? https : http;
      
      const req = requestLib.get(url, { timeout: 5000 }, (res) => {
        // Check if status code is successful (200-299)
        const statusCode = res.statusCode || 0;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        resolve(isSuccess);
        
        // Consume response data to free up memory
        res.resume();
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }
} 