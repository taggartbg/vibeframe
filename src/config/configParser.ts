import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConnectionManager } from '../communication/connectionManager';

// This file handles parsing various MCP configuration formats

export interface McpServerConfig {
  serverUrl: string;
  name?: string;
  source?: string; // Where this config was found
  isVerified?: boolean; // Whether the server has been verified to have a valid /vibeframe endpoint
  type?: string; // Type of the MCP server (e.g., 'sse')
}

// Define types for the different config formats
interface McpServer {
  url?: string;
  name?: string;
  type?: string;
}

interface McpConfig {
  mcpServers?: Record<string, McpServer | string>;
  mcpServer?: McpServer | string;
}

interface VSCodeMcpConfig {
  servers?: Record<string, McpServer | string>;
}

export class ConfigParser {
  // Main method to discover MCP servers from various config files
  public static async discoverMcpServers(): Promise<McpServerConfig[]> {
    const servers: McpServerConfig[] = [];
    
    try {
      // Get workspace folders
      const workspaceFolders = vscode.workspace.workspaceFolders || [];
      
      // Check for project-specific configurations first
      for (const folder of workspaceFolders) {
        // Cursor project config
        const cursorProjectServers = await this.parseCursorProjectConfig(folder.uri.fsPath);
        servers.push(...cursorProjectServers);
        
        // VS Code project config
        const vscodeProjectServers = await this.parseVSCodeProjectConfig(folder.uri.fsPath);
        servers.push(...vscodeProjectServers);
      }
      
      // Parse global configurations
      // Cursor global config
      const cursorGlobalServers = await this.parseCursorGlobalConfig();
      servers.push(...cursorGlobalServers);
      
      // Windsurf config
      const windsurfServers = await this.parseWindsurfConfig();
      servers.push(...windsurfServers);
      
      // VS Code global config
      const vscodeServers = await this.parseVSCodeConfig();
      servers.push(...vscodeServers);
      
      // Remove duplicates by URL
      const uniqueServers = this.removeDuplicates(servers);
      
      // Verify servers have valid /vibeframe endpoints
      const verifiedServers = await this.verifyServers(uniqueServers);
      
      return verifiedServers;
    } catch (error) {
      console.error('Error discovering MCP servers:', error);
      return [];
    }
  }
  
  // Verify that servers have valid /vibeframe endpoints
  private static async verifyServers(servers: McpServerConfig[]): Promise<McpServerConfig[]> {
    if (servers.length === 0) {
      return [];
    }
    
    const verificationPromises = servers.map(async server => {
      try {
        const isVerified = await ConnectionManager.verifyServerConnection(server);
        return {
          ...server,
          isVerified
        };
      } catch (error) {
        console.error(`Error verifying server ${server.serverUrl}:`, error);
        return {
          ...server,
          isVerified: false
        };
      }
    });
    
    // Wait for all verification checks to complete
    const verifiedServers = await Promise.all(verificationPromises);
    
    // By default, return all servers, even unverified ones
    // This allows users to still use a server even if verification fails
    // (they might know it works but it's temporarily down or verification has issues)
    return verifiedServers;
  }
  
  // Parse Cursor global configuration (from ~/.cursor/mcp.json)
  private static async parseCursorGlobalConfig(): Promise<McpServerConfig[]> {
    try {
      const homedir = os.homedir();
      const configPath = path.join(homedir, '.cursor', 'mcp.json');
      
      if (!fs.existsSync(configPath)) {
        return [];
      }
      
      const configData = await fs.promises.readFile(configPath, 'utf8');
      const config = JSON.parse(configData) as McpConfig;
      
      return this.extractCursorServers(config, 'Cursor (Global)');
    } catch (error) {
      console.error('Error parsing Cursor global config:', error);
      return [];
    }
  }
  
  // Parse Cursor project-specific configuration (from .cursor/mcp.json in the workspace folder)
  private static async parseCursorProjectConfig(workspacePath: string): Promise<McpServerConfig[]> {
    try {
      const configPath = path.join(workspacePath, '.cursor', 'mcp.json');
      
      if (!fs.existsSync(configPath)) {
        return [];
      }
      
      const configData = await fs.promises.readFile(configPath, 'utf8');
      const config = JSON.parse(configData) as McpConfig;
      
      return this.extractCursorServers(config, `Cursor (Project - ${path.basename(workspacePath)})`);
    } catch (error) {
      console.error('Error parsing Cursor project config:', error);
      return [];
    }
  }
  
  // Helper method to extract server configurations from Cursor config files
  private static extractCursorServers(config: McpConfig, source: string): McpServerConfig[] {
    const servers: McpServerConfig[] = [];
    
    // Handle mcpServers object with named server configurations
    if (config.mcpServers && typeof config.mcpServers === 'object') {
      for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        if (typeof serverConfig === 'string') {
          // Handle string format
          servers.push({
            serverUrl: this.ensureProtocol(serverConfig),
            name: name || 'Cursor MCP',
            source,
            type: 'default'
          });
        } else if (serverConfig && typeof serverConfig === 'object' && 'url' in serverConfig && serverConfig.url) {
          // Handle object format with url property
          servers.push({
            serverUrl: this.ensureProtocol(serverConfig.url),
            name: serverConfig.name || name || 'Cursor MCP',
            source,
            type: serverConfig.type || 'default'
          });
        }
      }
    }
    
    // Also check for legacy mcpServer property for backward compatibility
    if (!servers.length && config.mcpServer) {
      if (typeof config.mcpServer === 'string') {
        servers.push({
          serverUrl: this.ensureProtocol(config.mcpServer),
          name: 'Cursor MCP',
          source,
          type: 'default'
        });
      } else if (typeof config.mcpServer === 'object' && 'url' in config.mcpServer && config.mcpServer.url) {
        servers.push({
          serverUrl: this.ensureProtocol(config.mcpServer.url),
          name: config.mcpServer.name || 'Cursor MCP',
          source,
          type: config.mcpServer.type || 'default'
        });
      }
    }
    
    return servers;
  }
  
  // Parse Windsurf configuration (from ~/.codeium/windsurf/mcp_config.json)
  private static async parseWindsurfConfig(): Promise<McpServerConfig[]> {
    try {
      const homedir = os.homedir();
      const configPath = path.join(homedir, '.codeium', 'windsurf', 'mcp_config.json');
      
      if (!fs.existsSync(configPath)) {
        return [];
      }
      
      const configData = await fs.promises.readFile(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Windsurf has a different format than Cursor, it directly uses a string or object
      // for the MCP server configuration rather than an mcpServers object
      const servers: McpServerConfig[] = [];
      
      // Handle if config is just a string URL
      if (typeof config === 'string') {
        servers.push({
          serverUrl: this.ensureProtocol(config),
          name: 'Windsurf MCP',
          source: 'Windsurf',
          type: 'default'
        });
        return servers;
      }
      
      // Handle if config is an object with a url field
      if (typeof config === 'object' && config !== null) {
        // Check for direct url field in the root
        if ('url' in config && typeof config.url === 'string') {
          servers.push({
            serverUrl: this.ensureProtocol(config.url),
            name: (config as any).name || 'Windsurf MCP',
            source: 'Windsurf',
            type: (config as any).type || 'default'
          });
        }
        
        // Also check for servers array in the Windsurf format
        if (Array.isArray((config as any).servers)) {
          for (const server of (config as any).servers) {
            if (typeof server === 'string') {
              servers.push({
                serverUrl: this.ensureProtocol(server),
                name: 'Windsurf MCP',
                source: 'Windsurf',
                type: 'default'
              });
            } else if (typeof server === 'object' && server !== null && 'url' in server && typeof server.url === 'string') {
              servers.push({
                serverUrl: this.ensureProtocol(server.url),
                name: server.name || 'Windsurf MCP',
                source: 'Windsurf',
                type: server.type || 'default'
              });
            }
          }
        }
        
        // Additionally, check for mcpServers for compatibility with other formats
        if (typeof (config as any).mcpServers === 'object' && (config as any).mcpServers !== null) {
          for (const [name, serverConfig] of Object.entries((config as any).mcpServers)) {
            if (typeof serverConfig === 'string') {
              servers.push({
                serverUrl: this.ensureProtocol(serverConfig),
                name: name || 'Windsurf MCP',
                source: 'Windsurf',
                type: 'default'
              });
            } else if (serverConfig && typeof serverConfig === 'object' && 'url' in serverConfig && typeof (serverConfig as any).url === 'string') {
              servers.push({
                serverUrl: this.ensureProtocol((serverConfig as any).url),
                name: (serverConfig as any).name || name || 'Windsurf MCP',
                source: 'Windsurf',
                type: (serverConfig as any).type || 'default'
              });
            }
          }
        }
      }
      
      return servers;
    } catch (error) {
      console.error('Error parsing Windsurf config:', error);
      return [];
    }
  }
  
  // Parse VS Code configuration from settings
  private static async parseVSCodeConfig(): Promise<McpServerConfig[]> {
    try {
      const config = vscode.workspace.getConfiguration('vibeframe');
      const manualServers = config.get<Array<{name: string, url: string}>>('manualServerUrls', []);
      
      return manualServers
        .filter(server => server && server.url)
        .map(server => ({
          serverUrl: this.ensureProtocol(server.url),
          name: server.name || 'VS Code MCP',
          source: 'VS Code Settings',
          type: 'default'
        }));
    } catch (error) {
      console.error('Error parsing VS Code config:', error);
      return [];
    }
  }
  
  // Parse VS Code project-specific configuration (from .vscode/mcp.json in the workspace folder)
  private static async parseVSCodeProjectConfig(workspacePath: string): Promise<McpServerConfig[]> {
    try {
      const configPath = path.join(workspacePath, '.vscode', 'mcp.json');
      
      if (!fs.existsSync(configPath)) {
        return [];
      }
      
      const configData = await fs.promises.readFile(configPath, 'utf8');
      const config = JSON.parse(configData) as VSCodeMcpConfig;
      
      if (!config.servers || typeof config.servers !== 'object') {
        return [];
      }
      
      const servers: McpServerConfig[] = [];
      
      // Handle servers object with named server configurations
      for (const [name, serverConfig] of Object.entries(config.servers)) {
        if (typeof serverConfig === 'string') {
          // Handle string format
          servers.push({
            serverUrl: this.ensureProtocol(serverConfig),
            name: name || 'VS Code MCP',
            source: `VS Code (Project - ${path.basename(workspacePath)})`,
            type: 'default'
          });
        } else if (serverConfig && typeof serverConfig === 'object' && 'url' in serverConfig && serverConfig.url) {
          // Handle object format with url property
          servers.push({
            serverUrl: this.ensureProtocol(serverConfig.url),
            name: serverConfig.name || name || 'VS Code MCP',
            source: `VS Code (Project - ${path.basename(workspacePath)})`,
            type: 'default'
          });
        }
      }
      
      return servers;
    } catch (error) {
      console.error('Error parsing VS Code project config:', error);
      return [];
    }
  }
  
  // Helper method to ensure URLs have http:// or https:// protocol
  private static ensureProtocol(url: string): string {
    if (!url) {
      return url;
    }
    
    // If URL already has a protocol, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Add https:// by default
    return `https://${url}`;
  }
  
  // Helper method to remove duplicate servers by URL
  private static removeDuplicates(servers: McpServerConfig[]): McpServerConfig[] {
    const uniqueServers: McpServerConfig[] = [];
    const seenUrls = new Map<string, McpServerConfig>();
    
    // Process servers in reverse order they were added (global configs were added last)
    // This ensures project-specific configs (added first) take precedence
    // when we later reverse the array again
    for (let i = servers.length - 1; i >= 0; i--) {
      const server = servers[i];
      if (!seenUrls.has(server.serverUrl)) {
        seenUrls.set(server.serverUrl, server);
      } else {
        // If this URL already exists, check if current server is from a project config
        // Project configs contain "Project" in their source
        const existingServer = seenUrls.get(server.serverUrl)!;
        const isCurrentProject = server.source?.includes('Project') || false;
        const isExistingProject = existingServer.source?.includes('Project') || false;
        
        // If current is project-specific and existing is not, replace it
        if (isCurrentProject && !isExistingProject) {
          seenUrls.set(server.serverUrl, server);
        }
      }
    }
    
    // Convert Map back to array and reverse to maintain original order
    return Array.from(seenUrls.values()).reverse();
  }
}