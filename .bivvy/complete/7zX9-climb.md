<Climb>
  <header>
    <id>7zX9</id>
    <type>feature</type>
    <description>MCP Integration for VS Code Extension and Desktop Application</description>
  </header>
  <newDependencies>
    - Node.js (>=14.x)
    - VS Code Extension API
  </newDependencies>
  <prerequisitChanges>
    - Set up a basic VS Code extension project structure
    - Configure extension manifest (package.json) for necessary permissions
    - Prepare WebView infrastructure for embedding the MCP server's frontend
  </prerequisitChanges>
  <relevantFiles>
    - extension.ts (main extension file)
    - package.json (extension manifest)
    - configuration utilities for reading different IDE config formats
    - WebView implementation
  </relevantFiles>

  <featureOverview>
    <purpose>
      Enable seamless interaction between MCP servers and client UIs (VS Code extension + desktop app) by discovering servers and embedding their /vibeframe SPA within the development environment.
    </purpose>
    <problemSolved>
      Developers need to access MCP server functionality directly from their IDE without switching contexts, providing an integrated experience within their development workflow.
    </problemSolved>
    <successMetrics>
      - Successfully discovers MCP servers from all supported IDE config formats
      - Securely embeds the MCP server's /vibeframe endpoint in a WebView
      - Supports proper content security policies to allow the embedded app to function
      - Works across all platforms (Windows, macOS, Linux)
    </successMetrics>
  </featureOverview>

  <requirements>
    <functional>
      1. Discover MCP servers by parsing config files from multiple IDEs
      2. Verify that discovered servers have a valid /vibeframe endpoint
      3. Present a selection interface when multiple servers are found
      4. Create a WebView with appropriate CSP to load the /vibeframe SPA
      5. Configure WebView to properly allow the embedded app to function with required permissions
    </functional>
    <technical>
      1. Cross-platform compatibility (Windows, macOS, Linux)
      2. Secure content policies to prevent unauthorized access while allowing the embedded app to work
      3. Properly configured WebView that allows the embedded MCP frontend to handle its own communications
    </technical>
    <user>
      1. Simple activation of the MCP Canvas view
      2. Clear error messages when connections fail
      3. Intuitive server selection when multiple servers are available
    </user>
    <constraints>
      1. Must work within VS Code's extension security model
      2. WebView limitations regarding cross-origin communication
      3. Different configuration formats across various IDEs
    </constraints>
  </requirements>

  <designAndImplementation>
    <userFlow>
      1. User activates the extension via command palette ("Open MCP Canvas")
      2. Extension discovers MCP servers from config files
      3. If multiple servers, user selects the desired server
      4. WebView opens displaying the MCP server's frontend
      5. The embedded frontend handles its own communication with the MCP server
      6. User interacts with the MCP frontend within VS Code
    </userFlow>
    <architecture>
      - Extension Core: Handles activation, commands, and server discovery
      - Server Discovery: Reads and parses config files from various IDEs
      - WebView Manager: Creates and manages the WebView for embedding the frontend with proper permissions
    </architecture>
    <dependentComponents>
      - MCP Server: Must be running and accessible with a valid /vibeframe endpoint
      - VS Code Extension API: For creating WebViews and handling extension lifecycle
    </dependentComponents>
    <apiSpecifications>
      - Content Security Policy settings to allow the embedded app to function
      - WebView configuration for proper resource access
    </apiSpecifications>
  </designAndImplementation>

  <developmentDetails>
    <implementationApproach>
      1. Start with basic extension scaffolding using VS Code Extension Generator
      2. Implement server discovery with support for all config formats
      3. Create WebView with appropriate security policies to host the MCP frontend
      4. Configure proper CSP settings to allow the embedded app to function
    </implementationApproach>
    <securityConsiderations>
      - Appropriate Content Security Policy for the WebView to allow the embedded app to function securely
      - Proper validation of server URLs before loading content
    </securityConsiderations>
  </developmentDetails>

  <testingApproach>
    <testCases>
      - Server discovery from each config format
      - WebView creation and frontend loading
      - Proper CSP configuration to allow the frontend to communicate with its server
      - Error handling for various failure scenarios
    </testCases>
    <acceptanceCriteria>
      - Successfully discovers servers from all supported config formats
      - WebView properly loads the MCP server's frontend
      - The embedded frontend can communicate with its server
      - Appropriate error handling and user feedback
    </acceptanceCriteria>
    <edgeCases>
      - Multiple server configurations
      - Server unavailability after initial discovery
      - Network interruptions
    </edgeCases>
  </testingApproach>
</Climb> 