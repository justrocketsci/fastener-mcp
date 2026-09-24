# Zoo Adapter Testing Guide

This document describes how to verify the Zoo Design Studio adapter implementation.

## Prerequisites

- Deployed to Vercel (production or preview)
- Access to Zoo API token (for full testing)

## Test 1: Missing Token (Expected Behavior)

Without `ZOO_API_TOKEN` environment variable, the adapter should return HTTP 503.

```bash
curl -X POST https://fastener-mcp.vercel.app/api/adapters/zoo/insert \
  -H 'content-type: application/json' \
  -d '{"id":"iso-1207-m5-20"}' \
  -v
```

**Expected Response:**
```json
HTTP/1.1 503 Service Unavailable
{
  "ok": false,
  "error": "ZOO_API_TOKEN missing"
}
```

## Test 2: Invalid Fastener ID

```bash
curl -X POST https://fastener-mcp.vercel.app/api/adapters/zoo/insert \
  -H 'content-type: application/json' \
  -d '{"id":"nonexistent-fastener"}' \
  -v
```

**Expected Response:**
```json
HTTP/1.1 404 Not Found
{
  "ok": false,
  "error": "STEP file not found for fastener: nonexistent-fastener"
}
```

## Test 3: Valid Request with Token (Full Integration)

**Setup:**
1. Set `ZOO_API_TOKEN` in Vercel environment variables
2. Redeploy the application

**Test:**
```bash
curl -X POST https://fastener-mcp.vercel.app/api/adapters/zoo/insert \
  -H 'content-type: application/json' \
  -d '{"id":"iso-1207-m5-20"}' \
  -v
```

**Expected Response:**
```json
HTTP/1.1 200 OK
{
  "ok": true,
  "id": "iso-1207-m5-20",
  "projectId": "01234567-89ab-cdef-0123-456789abcdef",
  "zooUrl": "https://zoo.dev/share/...",
  "shareUrl": "https://zoo.dev/share/..."
}
```

**Verification Steps:**
1. Open the returned `shareUrl` in a browser
2. Verify the Zoo Design Studio project loads
3. Verify the STEP geometry is visible in the viewer
4. Check that `main.kcl` imports the STEP file correctly

## Test 4: MCP Tool Testing

**Via MCP Inspector:**
```bash
npx @modelcontextprotocol/inspector \
  https://fastener-mcp.vercel.app/api/mcp
```

**Call the tool:**
- Tool name: `insert_fastener_zoo`
- Arguments: `{ "id": "iso-1207-m5-20" }`

**Expected without token:**
```json
{
  "error": "ZOO_API_TOKEN missing",
  "id": "iso-1207-m5-20",
  "status": 503
}
```

**Expected with token:**
```json
{
  "ok": true,
  "id": "iso-1207-m5-20",
  "projectId": "01234567-89ab-cdef-0123-456789abcdef",
  "zooUrl": "https://zoo.dev/share/...",
  "shareUrl": "https://zoo.dev/share/...",
  "note": "Project created in Zoo Design Studio. Open via share link or download with: zoo project download <projectId>"
}
```

## Test 5: CLI Download Verification

If you have Zoo CLI installed:

```bash
# List your projects
zoo project list

# Download the created project
zoo project download <projectId>

# Verify the project structure
ls -la
# Should contain: project.toml, iso-1207-m5-20.step, main.kcl
```

## Sample Fastener IDs for Testing

- `iso-1207-m5-20` - M5×20 slotted pan head screw
- `iso-4017-m6-30` - M6×30 hex head bolt
- `nas1352-04-6` - #4-40 × 6 aerospace screw
- `an3-10a` - AN3-10A bolt

## Integration Test Workflow

1. Search for a fastener: `search_fasteners` MCP tool
2. Get details: `get_fastener` MCP tool
3. Insert to Zoo: `insert_fastener_zoo` MCP tool
4. Open in Zoo Design Studio via returned share URL
5. Continue modeling with Zoo KCL tools

## Notes

- Projects are created in your personal Zoo account
- Share links provide public read access
- Project title format: `Fastener: {id}`
- Project description: `Auto-inserted fastener {id} from fastener-mcp catalog`
- Files included:
  - `project.toml` - Minimal Zoo project config
  - `{id}.step` - STEP geometry from catalog
  - `main.kcl` - KCL file with STEP import
