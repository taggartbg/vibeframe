<Climb>
  <header>
    <id>K3Pc</id>
    <type>bug</type>
    <description>Fix MCP Server Configuration File Paths and Formats</description>
  </header>
  <newDependencies>
    - No new dependencies required
  </newDependencies>
  <prerequisitChanges>
    - Update the config file paths for Cursor, Windsurf, and VS Code
    - Update the config file parsing logic to match the correct formats
    - Remove Sourcegraph Cody support
  </prerequisitChanges>
  <relevantFiles>
    - src/config/configParser.ts (main file for configuration parsing)
    - src/extension.ts (may need updates for config handling)
  </relevantFiles>

  <featureOverview>
    <purpose>
      Fix incorrect MCP server configuration file paths and formats to ensure proper discovery and connection to MCP servers from various IDE integrations.
    </purpose>
    <problemSolved>
      The current implementation uses incorrect paths and formats for MCP configuration files across different IDEs, preventing proper server discovery and connection.
    </problemSolved>
    <successMetrics>
      - Successfully discovers MCP servers from Cursor, Windsurf, and VS Code using the correct file paths
      - Correctly parses the configuration formats for each IDE
      - Removes Sourcegraph Cody support as it's no longer needed
    </successMetrics>
  </featureOverview>

  <requirements>
    <functional>
      1. Update Cursor config file path to use `~/.cursor/mcp.json` (global) and `.cursor/mcp.json` (project-specific)
      2. Update Windsurf config file path to use `~/.codeium/windsurf/mcp_config.json`
      3. Update VS Code config file path to use `.vscode/mcp.json` (workspace-specific) in addition to the existing VS Code settings
      4. Update parsing logic to handle the different JSON formats for each IDE
      5. Remove Sourcegraph Cody support
    </functional>
    <technical>
      1. Maintain backward compatibility where possible
      2. Ensure proper error handling for missing or malformed configuration files
      3. Update the server discovery logic to handle the new configuration formats
    </technical>
    <user>
      1. No changes to the user interface or user experience
      2. Users should not need to manually update their configurations
    </user>
    <constraints>
      1. Must support both global and workspace/project-specific configurations
      2. Must handle potential conflicts between different configuration sources
    </constraints>
  </requirements>

  <designAndImplementation>
    <implementationApproach>
      1. Update the ConfigParser class to use the correct file paths
      2. Modify the parsing logic to handle the new JSON formats
      3. Add support for workspace/project-specific configurations
      4. Remove Sourcegraph Cody related code
      5. Update tests if needed
    </implementationApproach>
    <testingApproach>
      <testCases>
        - Test parsing Cursor configuration files
        - Test parsing Windsurf configuration files
        - Test parsing VS Code configuration files
        - Test handling missing or malformed configuration files
        - Test the server discovery logic with the new configuration formats
      </testCases>
    </testingApproach>
  </designAndImplementation>
</Climb> 