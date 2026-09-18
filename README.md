# Fastener MCP

Agent-facing fastener knowledge for AI CAD workflows. Sample dataset covering ISO metric, AN (Army-Navy), and MS (Military Standard) specifications with structured data optimized for MCP tool integration.

**⚠️ SAMPLE DATA ONLY** — Not a certified mil-spec or aerospace catalog. For demonstration purposes.

## Features

- **Structured Fastener Database**: ~40 representative parts across ISO, AN, and MS families
- **HTTP API**: RESTful endpoints for search, retrieval, and intelligent recommendations
- **Web UI**: Browse and filter fasteners with modern, accessible interface
- **MCP-Ready**: Designed for Model Context Protocol agent integration
- **Design System**: Built with Default Page design tokens (indigo primary, clean neutrals)

## Stack

- **Framework**: Next.js 16 + TypeScript + App Router
- **UI**: Tailwind CSS + shadcn/ui components
- **Data**: Static JSON seed dataset
- **Deployment**: Vercel-ready

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Verify API

Test the API endpoints:

```bash
# List all fasteners
curl "http://localhost:3000/api/fasteners"

# Search ISO metric bolts
curl "http://localhost:3000/api/fasteners?family=iso&q=bolt"

# Get specific fastener
curl "http://localhost:3000/api/fasteners/iso-4017-m6-30"

# Get recommendations
curl -X POST "http://localhost:3000/api/recommend" \
  -H "Content-Type: application/json" \
  -d '{"diameter": 6, "length": 30, "material": "steel"}'
```

## Project Structure

```
/workspace
├── app/
│   ├── api/
│   │   ├── fasteners/         # Search & get endpoints
│   │   └── recommend/          # Recommendation endpoint
│   ├── search/                 # Browse UI
│   ├── mcp/                    # MCP documentation
│   └── page.tsx                # Marketing landing
├── data/
│   └── fasteners.json          # Seed dataset (40 parts)
└── components/ui/              # shadcn components
```

## API Endpoints

### `GET /api/fasteners`

Search and filter fasteners.

**Query Parameters:**
- `q` - Search query (designation, material, capabilities)
- `family` - Filter by spec family (`iso`, `an`, `ms`)
- `diameter` - Filter by diameter (mm or inch)
- `material` - Filter by material keyword
- `limit` - Max results (default: 50)

### `GET /api/fasteners/:id`

Get fastener details by ID.

### `POST /api/recommend`

Get ranked recommendations based on requirements.

**Body:**
```json
{
  "diameter": 6,
  "length": 30,
  "material": "steel",
  "load_n": 5000,
  "environment": "outdoor"
}
```

See `/mcp` route for full documentation.

## Dataset

Sample fasteners include:
- **ISO Metric**: Hex bolts, socket caps, countersunk screws, washers, nuts
- **AN (Army-Navy)**: Drilled hex bolts, shear nuts, washers
- **MS (Military Std)**: Hex bolts, rivets, self-locking nuts, clevis pins

Each entry includes:
- Designation, family, diameter, length
- Thread specification
- Material and coating
- Tensile strength (where applicable)
- Capabilities tags

## Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Vercel
vercel deploy
```

Or push to Origin/GitHub and connect to Vercel for automatic deployments.

## MCP Integration

The HTTP endpoints are designed for direct agent calls or wrapping in an MCP stdio server. See `/mcp` docs for integration patterns.

Example MCP tools:
- `list_fasteners` → GET /api/fasteners
- `get_fastener` → GET /api/fasteners/:id  
- `recommend_fastener` → POST /api/recommend

## Design Tokens

Using Default Page design system:
- Primary: `#4F46E5` (indigo)
- Background: `#FFFFFF` / `#0F172A` (dark)
- Border: `#E2E8F0` / `#334155` (dark)
- Radius: 6px (sm) / 10px (md) / 12px (lg)
- Fonts: Inter Tight (headings) + Inter (body)

## Important Notes

- This is **sample data only** — not authoritative aerospace specs
- Do not use for safety-critical applications
- Monetization features are stubbed out
- Full MCP stdio implementation is optional

## License

Demonstration project. Check with appropriate authorities before using fastener data in production.
