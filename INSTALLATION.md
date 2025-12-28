# MCP Tools Installation Guide

## Purpose

These tools make the GARZA OS orchestrator auto-discoverable to Claude, preventing the use of raw `ssh_exec("fly deploy")` commands that bypass state tracking, locks, and rollback capabilities.

## Tools Overview

1. **`deploy_mcp_server`** - Deploy to Fly.io with state tracking
2. **`deploy_cloudflare_worker`** - Deploy Workers with state tracking
3. **`restart_service`** - Restart services with health checks
4. **`check_services_health`** - Comprehensive health monitoring
5. **`trigger_auto_recovery`** - Multi-step recovery playbooks
6. **`get_infrastructure_status`** - Full infrastructure overview

## Installation

### Option 1: Add to CF MCP (Recommended)

CF MCP runs on your Mac and provides the most direct integration.

**Location:** Find CF MCP installation directory
```bash
# On Mac, find CF MCP
find ~ -type d -name "cf-mcp" -o -name "cloudflare-mcp" 2>/dev/null
```

**Steps:**

1. **Copy Python implementation** from `orchestrator_tools.py` to CF MCP's `tools/` directory

2. **Add TypeScript tool definitions** (found at bottom of `orchestrator_tools.py`) to CF MCP's `index.ts`:

```typescript
// In server.setRequestHandler(ListToolsRequestSchema, ...)
{
  name: "deploy_mcp_server",
  description: "Deploy MCP server to Fly.io (DO NOT use ssh_exec for deployments). Provides state tracking, locks, rollback, and health checks.",
  inputSchema: {
    type: "object",
    properties: {
      app_name: { type: "string", description: "Fly.io app name" },
      source_dir: { type: "string", description: "Source directory (optional)" },
      region: { type: "string", description: "Fly.io region (default: dfw)" }
    },
    required: ["app_name"]
  }
},
// ... add remaining 5 tools
```

3. **Add tool handlers** in `server.setRequestHandler(CallToolRequestSchema, ...)`:

```typescript
case "deploy_mcp_server": {
  const { app_name, source_dir, region } = request.params.arguments as {
    app_name: string;
    source_dir?: string;
    region?: string;
  };
  
  // Execute Python function via subprocess or direct SSH
  const cmd = `cd /Users/customer/garza-os-github/orchestrator && python orchestrator.py deploy/mcp-server app_name=${app_name} source_dir=${source_dir || `/Users/customer/garza-os-github/mcp-servers/${app_name}`} region=${region || 'dfw'}`;
  
  const result = await execSSH("mac", cmd);
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}
```

4. **Restart CF MCP**
```bash
# If using pm2
pm2 restart cf-mcp

# If using systemd
systemctl --user restart cf-mcp
```

### Option 2: Add to Garza Home MCP (Alternative)

If CF MCP isn't accessible, add to Garza Home MCP instead.

**Location:** Likely deployed on Fly.io
```bash
fly ssh console -a garza-home-mcp
cd /app
```

Follow same steps as Option 1 but in Garza Home MCP's codebase.

### Option 3: Add to Last Rock Dev MCP (Fallback)

Same process as Option 2, but for Last Rock Dev MCP.

## Verification

After installation, verify tools are available:

```bash
# In Claude chat
"List available MCP tools"

# Should see:
# - deploy_mcp_server
# - deploy_cloudflare_worker  
# - restart_service
# - check_services_health
# - trigger_auto_recovery
# - get_infrastructure_status
```

## Testing

Test each tool:

```bash
# Health check (safe, read-only)
check_services_health(service_group="all")

# Infrastructure status (safe, read-only)
get_infrastructure_status()

# Deploy (creates real changes, use with caution)
deploy_mcp_server(app_name="garza-home-mcp")
```

## Why This Matters

**Before (Claude would do this):**
```bash
ssh_exec("fly deploy --app garza-home-mcp")
# ❌ No state tracking
# ❌ No distributed locks  
# ❌ No health checks
# ❌ No rollback capability
# ❌ No operation history
```

**After (Claude will do this):**
```bash
deploy_mcp_server(app_name="garza-home-mcp")
# ✅ State tracked in deployments.json
# ✅ Distributed lock prevents conflicts
# ✅ Pre/post health checks
# ✅ Automatic rollback on failure
# ✅ Full operation audit trail
```

## Tool Descriptions (Key Points)

Each tool has a **LOUD** description that guides Claude away from raw commands:

- **deploy_mcp_server**: "DO NOT use ssh_exec for deployments"
- **deploy_cloudflare_worker**: "DO NOT use ssh_exec('wrangler deploy')"
- **restart_service**: "DO NOT use ssh_exec('docker restart')"

Plus comprehensive Args/Returns documentation to make usage obvious.

## Troubleshooting

### Tools not showing up

1. Check MCP server logs for errors
2. Verify TypeScript syntax is correct
3. Restart MCP server completely
4. Check Claude's MCP connection status

### Tools failing when called

1. Verify SSH access from MCP server to Mac
2. Check orchestrator is at `/Users/customer/garza-os-github/orchestrator`
3. Verify Python environment has required dependencies
4. Check operation templates exist in `/operations/`

### Claude still using ssh_exec

1. Update `claude-preflight.md` with stronger warnings
2. Ensure tool descriptions include "DO NOT use ssh_exec"
3. Consider updating user memories to reinforce tool usage

## Next Steps

1. **Install tools** in CF MCP (or alternative MCP server)
2. **Test health check** tool (safe, read-only)
3. **Update preflight doc** with tool usage examples
4. **Monitor Claude's behavior** - does it prefer tools over ssh_exec?
5. **Iterate** - add more tools if needed, refine descriptions

## Related Files

- `orchestrator_tools.py` - Full Python implementation
- `../docs/claude-preflight.md` - Comprehensive usage guide
- `../orchestrator/README.md` - Orchestrator documentation
- `../.github/workflows/` - Automated workflows

---

*Last Updated: 2024-12-27 (Phase 5.5 - MCP Tool Integration)*
