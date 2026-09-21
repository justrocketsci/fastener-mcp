import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import fasteners from '@/data/fasteners.json';
import type { Fastener } from '@/lib/types';
import { buildPlacementPacket } from '@/lib/placement-packet';
import fs from 'fs';
import path from 'path';

const handler = createMcpHandler(
  (server) => {
    // Tool 1: Search fasteners
    server.registerTool(
      'search_fasteners',
      {
        title: 'Search Fasteners',
        description: 'Search and filter fasteners by criteria (designation, family, diameter, material, etc.)',
        inputSchema: z.object({
          q: z.string().optional().describe('Search query matching designation, material, capabilities, or notes'),
          family: z.enum(['iso', 'an', 'ms', 'nas']).optional().describe('Filter by spec family (ISO metric, AN Army-Navy, MS Military Standard, NAS National Aerospace Standard)'),
          diameter: z.union([z.string(), z.number()]).optional().describe('Filter by diameter (mm or inch)'),
          material: z.string().optional().describe('Filter by material keyword (e.g., steel, stainless, aluminum)'),
          standard: z.string().optional().describe('Filter by standard designation (e.g., ISO 4017, AN3, MS20004)'),
          source_kind: z.enum(['open_library', 'gov_spec', 'purchased_std', 'distributor_ref']).optional().describe('Filter by data source kind'),
          limit: z.number().optional().default(200).describe('Maximum number of results to return (default 200)')
        })
      },
      async ({ q, family, diameter, material, standard, source_kind, limit = 200 }) => {
        let results = [...fasteners] as Fastener[];

        if (q) {
          const query = q.toLowerCase();
          results = results.filter(f =>
            f.designation.toLowerCase().includes(query) ||
            f.notes.toLowerCase().includes(query) ||
            f.material.toLowerCase().includes(query) ||
            f.capabilities.some(c => c.toLowerCase().includes(query)) ||
            (f.standard && f.standard.toLowerCase().includes(query))
          );
        }

        if (family) {
          results = results.filter(f => f.family === family);
        }

        if (diameter) {
          const diam = typeof diameter === 'string' ? parseFloat(diameter) : diameter;
          results = results.filter(f => Math.abs(f.diameter - diam) < 0.5);
        }

        if (material) {
          const mat = material.toLowerCase();
          results = results.filter(f => f.material.toLowerCase().includes(mat));
        }

        if (standard) {
          const std = standard.toLowerCase();
          results = results.filter(f => f.standard && f.standard.toLowerCase().includes(std));
        }

        if (source_kind) {
          results = results.filter(f => f.source_kind === source_kind);
        }

        results = results.slice(0, limit);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              count: results.length,
              results: results.map(r => ({
                ...r,
                citation: r.source_kind && r.source_kind !== 'distributor_ref' ? {
                  standard: r.standard,
                  revision: r.revision,
                  source_kind: r.source_kind,
                  source_ref: r.source_ref,
                  license: r.license,
                  source_url: r.source_url
                } : undefined
              }))
            }, null, 2)
          }]
        };
      }
    );

    // Tool 2: Get fastener by ID
    server.registerTool(
      'get_fastener',
      {
        title: 'Get Fastener',
        description: 'Retrieve detailed information for a specific fastener by ID',
        inputSchema: z.object({
          id: z.string().describe('Fastener ID (e.g., iso-4017-m6-30, nas1352-04-6, an3-7a)')
        })
      },
      async ({ id }) => {
        const fastener = fasteners.find(f => f.id === id) as Fastener | undefined;

        if (!fastener) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ error: 'Fastener not found', id }, null, 2)
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              ...fastener,
              citation: fastener.source_kind && fastener.source_kind !== 'distributor_ref' ? {
                standard: fastener.standard,
                revision: fastener.revision,
                source_kind: fastener.source_kind,
                source_ref: fastener.source_ref,
                license: fastener.license,
                source_url: fastener.source_url
              } : undefined
            }, null, 2)
          }]
        };
      }
    );

    // Tool 3: Get fastener 3D model
    server.registerTool(
      'get_fastener_model',
      {
        title: 'Get Fastener 3D Model',
        description: 'Retrieve 3D STEP geometry URL and dimensions for a specific fastener. Returns absolute model URL for download/import.',
        inputSchema: z.object({
          id: z.string().describe('Fastener ID (e.g., iso-4017-m6-30, nas1352-04-6)')
        })
      },
      async ({ id }) => {
        const fastener = fasteners.find(f => f.id === id) as Fastener | undefined;

        if (!fastener) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ error: 'Fastener not found', id }, null, 2)
            }],
            isError: true
          };
        }

        const modelPath = path.join(process.cwd(), 'public', 'models', `${id}.step`);
        const modelExists = fs.existsSync(modelPath);

        if (!modelExists) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Model not available',
                reason: 'No simplified 3D model for this fastener (may be a nut/washer with length=0)',
                id
              }, null, 2)
            }],
            isError: true
          };
        }

        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : 'https://fastener-mcp.vercel.app';
        const modelUrl = `${baseUrl}/models/${id}.step`;

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: fastener.id,
              designation: fastener.designation,
              dimensions: {
                diameter: fastener.diameter,
                diameter_unit: fastener.diameter > 1 ? 'mm' : 'in',
                length_mm: fastener.length_mm,
                thread: fastener.thread
              },
              model_url: modelUrl,
              format: 'step',
              simplified_not_for_certification: true,
              disclaimer: 'Approximate BREP STEP from catalog dimensions via CadQuery / OpenCascade. NOT certified for engineering analysis or manufacturing. Always consult the controlling specification.',
              citation: fastener.source_kind && fastener.source_kind !== 'distributor_ref' ? {
                standard: fastener.standard,
                revision: fastener.revision,
                source_kind: fastener.source_kind,
                source_ref: fastener.source_ref,
                license: fastener.license,
                source_url: fastener.source_url
              } : undefined
            }, null, 2)
          }]
        };
      }
    );

    // Tool 4: Get placement packet
    server.registerTool(
      'get_placement_packet',
      {
        title: 'Get Placement Packet',
        description: 'Get CAD-agnostic placement packet with coordinate frame, honesty level (L1: insert-at-frame only), and adapter info. No automatic mates or hole detection.',
        inputSchema: z.object({
          id: z.string().describe('Fastener ID (e.g., iso-4017-m6-30, nas1352-04-6)')
        })
      },
      async ({ id }) => {
        const fastener = fasteners.find(f => f.id === id) as Fastener | undefined;

        if (!fastener) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({ error: 'Fastener not found', id }, null, 2)
            }],
            isError: true
          };
        }

        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : 'https://fastener-mcp.vercel.app';
        const packet = buildPlacementPacket(fastener, baseUrl);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(packet, null, 2)
          }]
        };
      }
    );
  },
  {
    serverInfo: {
      name: 'fastener-mcp',
      version: '1.0.0'
    }
  }
);

export { handler as GET, handler as POST };
