# Last Rock MCP

GARZA OS Last Rock Dev MCP Server - Infrastructure orchestration with state tracking, distributed locking, and automatic rollback.

## Features

🚀 **Infrastructure Orchestration**
- Deploy MCP servers to Fly.io with state tracking
- Deploy Cloudflare Workers with health checks
- Restart services with automatic rollback
- Comprehensive health monitoring
- Auto-recovery playbooks

🔒 **Safety & Reliability**
- Distributed locking prevents concurrent operations
- State tracking in deployments.json
- Pre/post deployment health checks
- Automatic rollback on failure
- Full operation audit trail

🛠️ **Tools Included**

1. `deploy_mcp_server` - Deploy to Fly.io with safety checks
2. `deploy_cloudflare_worker` - Deploy Workers with validation
3. `restart_service` - Safe service restarts with rollback
4. `check_services_health` - Monitor service health
5. `trigger_auto_recovery` - Execute recovery playbooks
6. `get_infrastructure_status` - Full infrastructure overview

## Installation

### For Development

```bash
npm install
npm run build
```

### For Production (Fly.io)

```bash
# Deploy to Fly.io
fly deploy

# Or use orchestrator (recommended)
deploy_mcp_server(app_name="lastrock-mcp")
```

## Usage in Claude

These tools are auto-discovered by Claude and preferred over raw `ssh_exec` commands:

```javascript
// ❌ DON'T DO THIS
ssh_exec("fly deploy --app garza-home-mcp")

// ✅ DO THIS INSTEAD
deploy_mcp_server(app_name="garza-home-mcp")
```

## Configuration

The orchestrator operates on:
- **Operations**: `/Users/customer/garza-os-github/operations/`
- **State**: `/Users/customer/garza-os-github/.orchestrator/state.json`
- **Locks**: `/Users/customer/garza-os-github/.orchestrator/locks/`

## Architecture

```
lastrock-mcp/
├── src/
│   └── index.ts          # MCP server implementation
├── build/                # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Testing

```bash
# Health check (safe, read-only)
check_services_health(service_group="all")

# Get infrastructure status
get_infrastructure_status()

# Deploy test (creates real changes!)
deploy_mcp_server(app_name="test-mcp")
```

## Integration

This MCP server integrates with GARZA OS orchestrator:
- Orchestrator: `/Users/customer/garza-os-github/orchestrator/`
- Operations: `/Users/customer/garza-os-github/operations/`
- Documentation: `/Users/customer/garza-os-github/docs/`

## Why This Matters

**Before:**
- Raw SSH commands
- No state tracking
- No safety checks
- No rollback capability
- Manual recovery

**After:**
- Managed orchestration
- Full state tracking
- Automatic health checks
- Automatic rollback
- Auto-recovery playbooks

## Related

- [Infrastructure Orchestrator](https://github.com/itsablabla/garza-os-github)
- [Garza Home MCP](https://github.com/itsablabla/garza-home-mcp)
- [CF Workers MCP](https://github.com/itsablabla/cf-workers-mcp)

## License

MIT - Jaden Garza
