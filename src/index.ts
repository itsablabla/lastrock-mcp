#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";

// Orchestrator base path
const ORCHESTRATOR_PATH = "/Users/customer/garza-os-github/orchestrator";

// Execute orchestrator command
function executeOrchestrator(operation: string, params: Record<string, string> = {}): any {
  const paramStr = Object.entries(params)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");
  
  const cmd = `cd ${ORCHESTRATOR_PATH} && python orchestrator.py ${operation} ${paramStr}`;
  
  try {
    const output = execSync(cmd, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024
    });
    
    // Try to parse as JSON, fallback to plain text
    try {
      return JSON.parse(output);
    } catch {
      return { output: output.trim() };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      stderr: error.stderr?.toString() || "",
      stdout: error.stdout?.toString() || ""
    };
  }
}

// Define tools
const tools: Tool[] = [
  {
    name: "deploy_mcp_server",
    description: "Deploy MCP server to Fly.io with state tracking, locks, and health checks. DO NOT use ssh_exec for deployments - always use this tool instead.",
    inputSchema: {
      type: "object",
      properties: {
        app_name: {
          type: "string",
          description: "Fly.io app name (e.g., 'garza-home-mcp')"
        },
        source_dir: {
          type: "string",
          description: "Source directory containing the MCP server code"
        },
        region: {
          type: "string",
          description: "Fly.io region (default: dfw)"
        }
      },
      required: ["app_name"]
    }
  },
  {
    name: "deploy_cloudflare_worker",
    description: "Deploy Cloudflare Worker with state tracking and health checks. DO NOT use ssh_exec('wrangler deploy') - always use this tool instead.",
    inputSchema: {
      type: "object",
      properties: {
        worker_name: {
          type: "string",
          description: "Worker name (e.g., 'voicenotes-webhook')"
        },
        source_dir: {
          type: "string",
          description: "Source directory containing wrangler.toml"
        },
        env: {
          type: "string",
          description: "Environment (production/staging, default: production)"
        }
      },
      required: ["worker_name"]
    }
  },
  {
    name: "restart_service",
    description: "Restart a service with pre/post health checks and automatic rollback. DO NOT use ssh_exec('docker restart') - always use this tool instead.",
    inputSchema: {
      type: "object",
      properties: {
        service_name: {
          type: "string",
          description: "Service name (e.g., 'garza-home-mcp', 'nginx', 'postgres')"
        },
        service_type: {
          type: "string",
          description: "Service type (fly_app/docker/systemd)"
        },
        health_check_url: {
          type: "string",
          description: "Optional URL to check service health"
        }
      },
      required: ["service_name", "service_type"]
    }
  },
  {
    name: "check_services_health",
    description: "Check health of one or more services. Safe read-only operation.",
    inputSchema: {
      type: "object",
      properties: {
        service_group: {
          type: "string",
          description: "Service group: 'all', 'mcp_servers', 'workers', 'infrastructure'"
        },
        service_names: {
          type: "array",
          items: { type: "string" },
          description: "Optional specific service names to check"
        }
      }
    }
  },
  {
    name: "trigger_auto_recovery",
    description: "Trigger automatic recovery for a failed service using predefined playbooks.",
    inputSchema: {
      type: "object",
      properties: {
        service_name: {
          type: "string",
          description: "Service that failed"
        },
        failure_type: {
          type: "string",
          description: "Type of failure: 'crash', 'health_check_failed', 'deployment_failed'"
        }
      },
      required: ["service_name", "failure_type"]
    }
  },
  {
    name: "get_infrastructure_status",
    description: "Get comprehensive overview of entire infrastructure. Safe read-only operation.",
    inputSchema: {
      type: "object",
      properties: {
        include_history: {
          type: "boolean",
          description: "Include recent operation history (default: true)"
        },
        include_locks: {
          type: "boolean",
          description: "Include active locks (default: true)"
        }
      }
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: "lastrock-mcp",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      case "deploy_mcp_server": {
        const { app_name, source_dir, region } = args as {
          app_name: string;
          source_dir?: string;
          region?: string;
        };
        
        result = executeOrchestrator("deploy/mcp-server", {
          app_name,
          source_dir: source_dir || `/Users/customer/${app_name}`,
          region: region || "dfw"
        });
        break;
      }

      case "deploy_cloudflare_worker": {
        const { worker_name, source_dir, env } = args as {
          worker_name: string;
          source_dir?: string;
          env?: string;
        };
        
        result = executeOrchestrator("deploy/cloudflare-worker", {
          worker_name,
          source_dir: source_dir || `/Users/customer/${worker_name}`,
          env: env || "production"
        });
        break;
      }

      case "restart_service": {
        const { service_name, service_type, health_check_url } = args as {
          service_name: string;
          service_type: string;
          health_check_url?: string;
        };
        
        const params: Record<string, string> = {
          service_name,
          service_type
        };
        
        if (health_check_url) {
          params.health_check_url = health_check_url;
        }
        
        result = executeOrchestrator("maintain/restart-service", params);
        break;
      }

      case "check_services_health": {
        const { service_group, service_names } = args as {
          service_group?: string;
          service_names?: string[];
        };
        
        const params: Record<string, string> = {};
        
        if (service_group) {
          params.service_group = service_group;
        }
        
        if (service_names) {
          params.service_names = service_names.join(",");
        }
        
        result = executeOrchestrator("maintain/health-check", params);
        break;
      }

      case "trigger_auto_recovery": {
        const { service_name, failure_type } = args as {
          service_name: string;
          failure_type: string;
        };
        
        result = executeOrchestrator("recovery/auto-recovery", {
          service_name,
          failure_type
        });
        break;
      }

      case "get_infrastructure_status": {
        const { include_history, include_locks } = args as {
          include_history?: boolean;
          include_locks?: boolean;
        };
        
        const params: Record<string, string> = {
          include_history: String(include_history !== false),
          include_locks: String(include_locks !== false)
        };
        
        result = executeOrchestrator("status/infrastructure", params);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Last Rock MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
