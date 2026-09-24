import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Server - Fastener MCP',
  description: 'Model Context Protocol server for AI agents. Connect Cursor, Claude, or other MCP clients to search and retrieve fastener specs and 3D models.',
};

export default function MCPDocsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-foreground">
            Fastener MCP
          </Link>
          <nav className="flex gap-6">
            <Link href="/search" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Search
            </Link>
            <Link href="/mcp" className="text-sm font-medium text-foreground">
              MCP Docs
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 flex flex-col md:flex-row gap-6 items-start">
            <div className="flex-1">
              <Badge variant="secondary" className="mb-2">
                Live MCP Server
              </Badge>
              <h1 className="text-3xl font-bold mb-2">MCP Server for AI Agents</h1>
              <p className="text-muted-foreground">
                Streamable HTTP transport for Model Context Protocol. Connect Cursor, Claude Desktop, or other MCP clients to search fasteners and retrieve 3D STEP models.
              </p>
            </div>
            <div className="flex-shrink-0 hidden md:block">
              <Image
                src="/illustrations/socket-screw.png"
                alt="Flat illustration of a socket head cap screw"
                width={120}
                height={120}
                className="w-28 h-28 object-contain opacity-40"
              />
            </div>
          </div>

          <div className="space-y-8">
            <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950 dark:border-indigo-800">
              <CardHeader>
                <CardTitle>Connect to MCP Server</CardTitle>
                <CardDescription>Add this server to Cursor, Claude Desktop, or any MCP client</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Server URL</h3>
                  <code className="block bg-background p-3 rounded text-sm font-mono">
                    https://fastener-mcp.vercel.app/api/mcp
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Cursor Configuration</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add to your Cursor settings (Cursor Settings → Features → Model Context Protocol):
                  </p>
                  <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "fastener-mcp": {
      "url": "https://fastener-mcp.vercel.app/api/mcp"
    }
  }
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Claude Desktop Configuration</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add to <code className="bg-muted px-1 py-0.5 rounded text-xs">claude_desktop_config.json</code>:
                  </p>
                  <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "fastener-mcp": {
      "url": "https://fastener-mcp.vercel.app/api/mcp"
    }
  }
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">MCP Inspector</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Test with the official MCP Inspector:
                  </p>
                  <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
{`npx @modelcontextprotocol/inspector \\
  https://fastener-mcp.vercel.app/api/mcp`}
                  </pre>
                </div>

                <Alert className="bg-background">
                  <AlertDescription className="text-sm">
                    <strong>Transport:</strong> Streamable HTTP (MCP specification 2026-07-28). No authentication required for read-only catalog access.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Tools</CardTitle>
                <CardDescription>Nine MCP tools for fastener catalog, CAD insertion, installation, compatibility, and procurement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <Badge variant="outline" className="mb-2">Core Catalog Tools</Badge>
                </div>
                <div>
                  <code className="font-semibold">search_fasteners</code>
                  <p className="text-muted-foreground mt-1">Search and filter fasteners by designation, family, diameter, material, standard</p>
                </div>
                <div>
                  <code className="font-semibold">get_fastener</code>
                  <p className="text-muted-foreground mt-1">Retrieve detailed specifications for a specific fastener by ID</p>
                </div>
                <div>
                  <code className="font-semibold">get_fastener_model</code>
                  <p className="text-muted-foreground mt-1">Get 3D STEP geometry URL and dimensions (absolute production URL)</p>
                </div>
                <div>
                  <code className="font-semibold">get_placement_packet</code>
                  <p className="text-muted-foreground mt-1">Get CAD-agnostic placement packet with coordinate frame and honesty level (L1: insert-at-frame)</p>
                </div>
                <div>
                  <code className="font-semibold">insert_fastener_zoo</code>
                  <p className="text-muted-foreground mt-1">Create a Zoo Design Studio project with the fastener STEP model. Returns project ID and shareable URL. Use beside zoo-mcp for KCL workflows.</p>
                </div>
                <div className="pt-2">
                  <Badge variant="outline" className="mb-2">Extended Catalog Tools</Badge>
                </div>
                <div>
                  <code className="font-semibold">get_installation_requirements</code>
                  <p className="text-muted-foreground mt-1">Read sourced installation requirements and required missing host/process context</p>
                </div>
                <div>
                  <code className="font-semibold">get_compatible_parts</code>
                  <p className="text-muted-foreground mt-1">Find checked nominal companion interfaces and unresolved assembly requirements</p>
                </div>
                <div>
                  <code className="font-semibold">compare_supplier_offers</code>
                  <p className="text-muted-foreground mt-1">Compare exact supplier variants for quantity, destination and currency. Partial costs never imply a delivered-cost winner.</p>
                </div>
                <div>
                  <code className="font-semibold">build_parts_list</code>
                  <p className="text-muted-foreground mt-1">Aggregate explicit part revisions and quantities into JSON and escaped CSV. No purchasing.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <CardHeader>
                <CardTitle>Supplier Offer Honesty</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <Badge variant="outline" className="mr-2">HONEST PRICING</Badge>
                  The <code className="bg-muted px-1 py-0.5 rounded text-xs">compare_supplier_offers</code> tool follows strict honesty rules:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Only compares supplier offers with explicitly fetched data (snapshot)</li>
                  <li>Never invents or infers shipping, tax, duty, or stock levels</li>
                  <li>Does NOT declare a delivered-cost winner when shipping/tax/duty/stock is missing</li>
                  <li>Returns partial cost breakdowns with clear unavailable markers</li>
                  <li>Prices are time-stamped snapshots; check evidence URLs for currency</li>
                </ul>
                <p className="text-muted-foreground pt-2 border-t border-amber-200 dark:border-amber-800">
                  Extended tools currently cover 27 metric fasteners (M3-M6 bolts, nuts, washers, helicoils). 
                  For parts without installation/offer data, tools return structured unavailable responses.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>search_fasteners</CardTitle>
                <CardDescription>Search and filter fasteners by criteria</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Endpoint</h3>
                  <code className="block bg-muted p-3 rounded text-sm">
                    GET /api/fasteners
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Query Parameters</h3>
                  <ul className="space-y-2 text-sm">
                    <li><code className="bg-muted px-2 py-1 rounded">q</code> - Search query (designation, material, capabilities)</li>
                    <li><code className="bg-muted px-2 py-1 rounded">family</code> - Filter by spec family (iso, an, ms, nas)</li>
                    <li><code className="bg-muted px-2 py-1 rounded">diameter</code> - Filter by diameter (mm or inch)</li>
                    <li><code className="bg-muted px-2 py-1 rounded">material</code> - Filter by material keyword</li>
                    <li><code className="bg-muted px-2 py-1 rounded">limit</code> - Max results (default: 50)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Request</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`curl "https://fastener-mcp.example/api/fasteners?family=iso&q=steel&limit=10"`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Response</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "count": 2,
  "results": [
    {
      "id": "iso-4017-m6-30",
      "designation": "ISO 4017 M6×30",
      "family": "iso",
      "diameter": 6,
      "length_mm": 30,
      "thread": "M6×1.0",
      "material": "Steel Grade 8.8",
      "tensile_strength_mpa": 800,
      "coating": "Zinc plated",
      "notes": "Hex head bolt, fully threaded",
      "capabilities": ["structural", "general-purpose", "moderate-strength"]
    }
  ]
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>get_fastener</CardTitle>
                <CardDescription>Retrieve details for a specific fastener by ID</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Endpoint</h3>
                  <code className="block bg-muted p-3 rounded text-sm">
                    GET /api/fasteners/:id
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Request</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`curl "https://fastener-mcp.example/api/fasteners/iso-4017-m6-30"`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Response</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "id": "iso-4017-m6-30",
  "designation": "ISO 4017 M6×30",
  "family": "iso",
  "diameter": 6,
  "length_mm": 30,
  "thread": "M6×1.0",
  "material": "Steel Grade 8.8",
  "tensile_strength_mpa": 800,
  "coating": "Zinc plated",
  "notes": "Hex head bolt, fully threaded",
  "capabilities": ["structural", "general-purpose", "moderate-strength"]
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>get_fastener_model</CardTitle>
                <CardDescription>Retrieve 3D STEP geometry and dimensions for a specific fastener</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Endpoint</h3>
                  <code className="block bg-muted p-3 rounded text-sm">
                    GET /api/fasteners/:id/model
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Request</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`curl "https://fastener-mcp.example/api/fasteners/nas1352-04-6/model"`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Response</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "id": "nas1352-04-6",
  "designation": "NAS1352-04-6",
  "dimensions": {
    "diameter": 0.112,
    "diameter_unit": "in",
    "length_mm": 15.875,
    "thread": "#4-40 UNF"
  },
  "model_url": "https://fastener-mcp.example/models/nas1352-04-6.step",
  "format": "step",
  "simplified_not_for_certification": true,
  "disclaimer": "Approximate BREP STEP from catalog dimensions via CadQuery / OpenCascade. NOT certified for engineering analysis or manufacturing. Always consult the controlling specification.",
  "citation": {
    "standard": "NAS1352",
    "revision": "Rev 11",
    "source_kind": "purchased_std",
    "source_ref": "NAS1352 Rev 11 (Anu-supplied PDF extract)",
    "license": "proprietary_cite"
  }
}`}
                  </pre>
                </div>

                <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                  <AlertDescription className="text-sm">
                    <strong>NOT FOR CERTIFICATION:</strong> STEP models are approximate BREP from catalog dimensions via CadQuery (OpenCascade BREP). 
                    Do not use for FEA, manufacturing tolerances, or certified engineering work.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>get_placement_packet</CardTitle>
                <CardDescription>Get CAD-agnostic placement packet with frame, honesty, and adapter info</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Endpoint</h3>
                  <code className="block bg-muted p-3 rounded text-sm">
                    GET /api/fasteners/:id/placement
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Request</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`curl "https://fastener-mcp.example/api/fasteners/iso-4017-m6-30/placement"`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Response</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "schema": "fastener-mcp.placement.v0",
  "id": "iso-4017-m6-30",
  "part_designation": "ISO 4017 M6×30",
  "standard": "ISO 4017",
  "model": {
    "format": "step",
    "url": "https://fastener-mcp.example/models/iso-4017-m6-30.step",
    "available": true
  },
  "frame": {
    "origin": "head_bearing_face_center",
    "axis": "+Z_along_shank_toward_tip",
    "units": "mm",
    "grip_length_mm": 30,
    "head_side": "+Z"
  },
  "citations": {
    "source_kind": "open_library",
    "source_ref": "fasteners library",
    "source_url": "https://github.com/boltsparts/BOLTS",
    "revision": "0.4",
    "license": "LGPL-2.1+",
    "confidence": "exact"
  },
  "honesty": {
    "level": "L1_insert_at_frame",
    "not_certified_mates": true,
    "not_fit_critical": true,
    "geometry": "Approximate BREP STEP from catalog dimensions via CadQuery / OpenCascade (or Onshape export when applicable). NOT certified for engineering analysis or manufacturing."
  },
  "adapters": {
    "onshape": {
      "insert": "POST /api/adapters/onshape/insert",
      "status": "experimental"
    },
    "zoo": {
      "insert": "POST /api/adapters/zoo/insert",
      "mcp_tool": "insert_fastener_zoo",
      "status": "experimental"
    }
  }
}`}
                  </pre>
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <AlertDescription className="text-sm">
                    <strong>L1 PLACEMENT HONESTY:</strong> This packet enables insert-at-frame placement only. 
                    Mates, hole detection, and fit-critical validation (L2/L3) are not yet implemented.
                  </AlertDescription>
                </Alert>

                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="font-semibold mb-2 text-sm">Experimental Adapters</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Experimental adapters for CAD platform insertion:
                  </p>
                  <div className="mb-3">
                    <p className="text-sm font-medium">Onshape</p>
                    <p className="text-sm text-muted-foreground mb-1">
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">POST /api/adapters/onshape/insert</code>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                      <li>Requires server environment variables: <code className="bg-muted px-1 py-0.5 rounded text-xs">ONSHAPE_ACCESS_KEY</code> and <code className="bg-muted px-1 py-0.5 rounded text-xs">ONSHAPE_SECRET_KEY</code></li>
                      <li>Inserts STEP file at document origin/frame</li>
                      <li>No automatic mates or hole detection</li>
                      <li>Uses configured test document for all inserts</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Zoo Design Studio</p>
                    <p className="text-sm text-muted-foreground mb-1">
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">POST /api/adapters/zoo/insert</code> or MCP tool <code className="bg-muted px-1 py-0.5 rounded text-xs">insert_fastener_zoo</code>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                      <li>Requires server environment variable: <code className="bg-muted px-1 py-0.5 rounded text-xs">ZOO_API_TOKEN</code></li>
                      <li>Creates a Zoo Design Studio project with STEP model and KCL import</li>
                      <li>Returns project ID and shareable URL</li>
                      <li>Use beside zoo-mcp (<code className="bg-muted px-1 py-0.5 rounded text-xs">uvx zoo-mcp</code>) for KCL → STEP workflows</li>
                      <li>Open via share link or download with: <code className="bg-muted px-1 py-0.5 rounded text-xs">zoo project download &lt;projectId&gt;</code></li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>insert_fastener_zoo</CardTitle>
                <CardDescription>Create a Zoo Design Studio project with fastener STEP model</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Endpoint</h3>
                  <code className="block bg-muted p-3 rounded text-sm">
                    POST /api/adapters/zoo/insert
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Request Body</h3>
                  <ul className="space-y-2 text-sm">
                    <li><code className="bg-muted px-2 py-1 rounded">id</code> - Fastener ID (e.g., iso-1207-m5-20, nas1352-04-6)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Request</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`curl -X POST "https://fastener-mcp.vercel.app/api/adapters/zoo/insert" \\
  -H "Content-Type: application/json" \\
  -d '{"id":"iso-1207-m5-20"}'`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Response</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "ok": true,
  "id": "iso-1207-m5-20",
  "projectId": "01234567-89ab-cdef-0123-456789abcdef",
  "zooUrl": "https://zoo.dev/share/...",
  "shareUrl": "https://zoo.dev/share/..."
}`}
                  </pre>
                </div>

                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <AlertDescription className="text-sm">
                    <strong>Zoo + MCP workflow:</strong> Use this tool alongside zoo-mcp (<code className="bg-muted px-1 py-0.5 rounded text-xs">uvx zoo-mcp</code>) for fastener → STEP → KCL design workflows.
                    Projects are created in your Zoo account and can be opened via share link or downloaded with <code className="bg-muted px-1 py-0.5 rounded text-xs">zoo project download &lt;projectId&gt;</code>.
                  </AlertDescription>
                </Alert>

                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="font-semibold mb-2 text-sm">Missing Token Behavior</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Without <code className="bg-muted px-1 py-0.5 rounded text-xs">ZOO_API_TOKEN</code> environment variable:
                  </p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`HTTP 503 Service Unavailable
{
  "ok": false,
  "error": "ZOO_API_TOKEN missing"
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>recommend_fastener</CardTitle>
                <CardDescription>Get ranked fastener recommendations based on requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Endpoint</h3>
                  <code className="block bg-muted p-3 rounded text-sm">
                    POST /api/recommend
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Request Body</h3>
                  <ul className="space-y-2 text-sm">
                    <li><code className="bg-muted px-2 py-1 rounded">diameter</code> - Required diameter (mm or inch)</li>
                    <li><code className="bg-muted px-2 py-1 rounded">length</code> - Required length (mm)</li>
                    <li><code className="bg-muted px-2 py-1 rounded">material</code> - Preferred material (e.g., "steel", "stainless")</li>
                    <li><code className="bg-muted px-2 py-1 rounded">load_n</code> - Load requirement in Newtons</li>
                    <li><code className="bg-muted px-2 py-1 rounded">environment</code> - Operating environment (e.g., "outdoor", "aerospace")</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Request</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`curl -X POST "https://fastener-mcp.example/api/recommend" \\
  -H "Content-Type: application/json" \\
  -d '{
    "diameter": 6,
    "length": 30,
    "material": "steel",
    "load_n": 5000,
    "environment": "outdoor"
  }'`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Response</h3>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`{
  "count": 3,
  "recommendations": [
    {
      "id": "iso-4017-m6-30",
      "designation": "ISO 4017 M6×30",
      "family": "iso",
      "diameter": 6,
      "length_mm": 30,
      "material": "Steel Grade 8.8",
      "match_score": 150,
      "reasons": [
        "Diameter matches requirement",
        "Length matches requirement",
        "Material matches requirement"
      ]
    }
  ]
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <CardHeader>
                <CardTitle>Important Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <Badge variant="outline" className="mr-2">MIXED CATALOG</Badge>
                  This is a demonstration dataset with ~109 representative parts. It is NOT a complete or certified mil-spec catalog.
                </p>
                <p>
                  Data includes sample ISO metric, AN (Army-Navy), MS (Military Standard), and NAS (proprietary aerospace) specifications for AI agent testing and development.
                </p>
                <p>
                  Do not use for production aerospace, defense, or safety-critical applications without validating against authoritative specifications.
                </p>
                <p className="text-muted-foreground pt-2 border-t border-amber-200 dark:border-amber-800">
                  Paid MCP access — coming later
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Primary Consumers</CardTitle>
                <CardDescription>Who uses this MCP server</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  This server is designed for <strong>AI coding assistants and CAD agents</strong> that connect to remote MCP servers:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Cursor</strong> — AI code editor with MCP support</li>
                  <li><strong>Claude Desktop</strong> — Anthropic&apos;s desktop app with MCP integration</li>
                  <li><strong>AI CAD workflows</strong> — Use alongside Zoo MCP (<code>uvx zoo-mcp</code>) for fastener → KCL/import workflows</li>
                  <li><strong>MCP Inspector</strong> — Official debugging tool</li>
                </ul>
                <p className="mt-3 text-muted-foreground">
                  Note: Adam&apos;s MCP (<code>https://adam.new/mcp</code>) is their own server, not a consumer of third-party MCP servers. 
                  Users running Adam&apos;s CAD tools would configure this Fastener MCP in their Cursor/Claude client.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Direct REST API Access</CardTitle>
                <CardDescription>HTTP endpoints underlying the MCP tools (optional, for non-MCP integrations)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  MCP tools wrap these existing REST endpoints. You can call them directly without MCP:
                </p>
                <div>
                  <Badge variant="outline" className="mb-2">Core Endpoints</Badge>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li><code>GET /api/fasteners</code> — Search/list</li>
                    <li><code>GET /api/fasteners/:id</code> — Detail</li>
                    <li><code>GET /api/fasteners/:id/model</code> — 3D STEP URL</li>
                    <li><code>GET /api/fasteners/:id/placement</code> — Placement packet</li>
                    <li><code>POST /api/recommend</code> — Recommendations</li>
                  </ul>
                </div>
                <div className="pt-2">
                  <Badge variant="outline" className="mb-2">Extended Endpoints</Badge>
                  <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                    <li><code>GET /api/fasteners/:id/installation</code> — Installation requirements</li>
                    <li><code>POST /api/compatibility</code> — Compatible parts</li>
                    <li><code>POST /api/offers/compare</code> — Supplier offers comparison</li>
                    <li><code>POST /api/bom</code> — Build parts list</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-4 mt-12">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-center items-center gap-4">
            <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">
              Search
            </Link>
            <Link href="/mcp" className="text-sm text-muted-foreground hover:text-foreground">
              MCP Docs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
