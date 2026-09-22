> Historical document. This workflow is retired; see the current README and docs/MIGRATION.md for the portable CadQuery/MCP workflow.

# Onshape Element Right Panel Integration

## Overview

The Fastener MCP Onshape panel is a thin client interface that allows users to search and access fastener specifications, STEP models, and placement data directly within Onshape's CAD environment.

## Panel Features

- **340px-wide panel** designed to sit in Onshape's Element right panel
- **Search functionality** with debounce for responsive catalog browsing
- **Source badges** (Open Library, Gov Spec, Purchased Std) for transparency
- **Simplified STEP downloads** with clear "not for certification" messaging
- **L1 CAD-agnostic placement data** with copy-to-clipboard functionality
- **No auto-insert** — panel is catalog-only (insert functionality parked)

## Registration Instructions (Personal OAuth / Private)

This panel is designed for **private use** with personal OAuth. It is **not submitted to the Onshape App Store**.

### Steps to Register

1. **Open Onshape Developer Settings**
   - Individual account: My Account → Developer
   - Company account: Company Settings → Developer

2. **Create OAuth Application**
   - Click "Create new OAuth application"
   - Name: `Fastener MCP`
   - Primary format: `com.fastener.mcp` (or your preferred format)
   - Redirect URLs: Not required for panel-only access
   - Permission scopes: None required for read-only catalog access

3. **Add Extension**
   - In your OAuth application, go to Extensions
   - Click "Add extension"
   - Configure as follows:
     - **Location**: `Element right panel`
     - **Context**: `Inside part studio` (recommended, or choose your preferred context)
     - **Action URL**: 
       ```
       https://fastener-mcp.vercel.app/onshape/panel?documentId={$documentId}&workspaceId={$workspaceOrVersionId}&elementId={$elementId}
       ```
       ⚠️ **Important**: Use `workspaceId={$workspaceOrVersionId}` (not `{$workspaceId}`) — Onshape's placeholder must be `{$workspaceOrVersionId}`.
     - **Icon**: Upload `/public/onshape/icon.svg` (32×32px, indigo rounded square with white bolt)
     - **Name**: `Fastener MCP`
     - **Tooltip**: `Fastener MCP`

4. **Access the Panel**
   - Open any Part Studio in Onshape
   - Look for the Fastener MCP icon in the right vertical toolbar
   - Click to open the panel

## Technical Details

### Client Messaging

The panel implements Onshape's client messaging protocol:
- Sends `applicationInit` on load with document/workspace/element IDs
- Sends `keepAlive` every 30 seconds to maintain connection
- Validates message origins against the `server` query parameter

### API Integration

The panel calls the following public APIs on the same origin:
- `GET /api/fasteners` — List/search fasteners
- `GET /api/fasteners/[id]` — Get fastener details
- `GET /api/fasteners/[id]/model` — Download STEP file
- `GET /api/fasteners/[id]/placement` — Get placement data packet

### Security

- Origin validation for all postMessage communications
- No Onshape OAuth token required for read-only catalog access
- HTTPS-only in production (required by Onshape)

## Future Considerations

- **App Store submission**: Would require Launch Checklist completion and Onshape DevRel approval
- **Auto-insert functionality**: Currently parked; would require Onshape API integration and quota management
- **Company-wide deployment**: Can be assigned to teams by company admin without App Store entry

## References

- [Onshape Extensions Documentation](https://onshape-public.github.io/docs/app-dev/extensions/)
- [Onshape Client Messaging](https://onshape-public.github.io/docs/app-dev/messages/)
- [Onshape Hello World Tutorial](https://onshape-public.github.io/docs/app-dev/helloworld/)

## Support

For issues or questions, contact the maintainer or file an issue in the repository.
