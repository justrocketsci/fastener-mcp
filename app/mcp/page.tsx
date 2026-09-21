import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Documentation - Fastener MCP',
  description: 'HTTP API documentation for Model Context Protocol integration.',
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
                HTTP API
              </Badge>
              <h1 className="text-3xl font-bold mb-2">MCP Tools Documentation</h1>
              <p className="text-muted-foreground">
                HTTP endpoints designed for AI agent integration via Model Context Protocol (MCP).
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
            <Card>
              <CardHeader>
                <CardTitle>list_fasteners</CardTitle>
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
                <CardTitle>MCP Stdio Integration (Optional)</CardTitle>
                <CardDescription>Full MCP server implementation is optional for this MVP</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  The HTTP endpoints above can be called directly by AI agents or wrapped in an MCP stdio server.
                </p>
                <p>
                  For stdio MCP integration, implement tools that map to these endpoints:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><code>list_fasteners</code> → GET /api/fasteners</li>
                  <li><code>get_fastener</code> → GET /api/fasteners/:id</li>
                  <li><code>get_fastener_model</code> → GET /api/fasteners/:id/model</li>
                  <li><code>get_placement_packet</code> → GET /api/fasteners/:id/placement</li>
                  <li><code>recommend_fastener</code> → POST /api/recommend</li>
                </ul>
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
