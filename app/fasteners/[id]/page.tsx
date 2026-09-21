import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FastenerActions } from './fastener-actions';
import { ModelSection } from './model-section';
import { PlacementSection } from './placement-section';
import fasteners from '@/data/fasteners.json';
import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import type { Fastener } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const fastener = fasteners.find(f => f.id === id);
  
  if (!fastener) {
    return {
      title: 'Fastener Not Found - Fastener MCP',
    };
  }

  return {
    title: `${fastener.designation} - Fastener MCP`,
  };
}

export default async function FastenerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const fastener = fasteners.find(f => f.id === id) as Fastener | undefined;

  if (!fastener) {
    notFound();
  }

  const modelPath = path.join(process.cwd(), 'public', 'models', `${id}.step`);
  const modelExists = fs.existsSync(modelPath);
  const onshapeConfigured = !!(process.env.ONSHAPE_ACCESS_KEY && process.env.ONSHAPE_SECRET_KEY);

  // Onshape insert feature parked until Anu reopens it
  const onshapeConfigured = false;

  const getFamilyLabel = (fam: string) => {
    switch (fam) {
      case 'iso':
        return 'ISO Metric';
      case 'an':
        return 'AN (Army-Navy)';
      case 'ms':
        return 'MS (Military Std)';
      case 'nas':
        return 'NAS (Aerospace)';
      default:
        return fam.toUpperCase();
    }
  };

  const getSourceLabel = (sourceKind?: string) => {
    switch (sourceKind) {
      case 'open_library':
        return { label: 'Open Library', variant: 'default' as const, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
      case 'gov_spec':
        return { label: 'Gov Spec', variant: 'default' as const, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
      case 'purchased_std':
        return { label: 'Purchased Std', variant: 'default' as const, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' };
      case 'distributor_ref':
        return { label: 'Legacy', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
      default:
        return { label: 'Sample', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(fastener, null, 2));
  };

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
            <Link href="/mcp" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              MCP Docs
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-4">
            <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to search
            </Link>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-3xl font-bold font-heading mb-2">
                    {fastener.designation}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {fastener.notes}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{getFamilyLabel(fastener.family)}</Badge>
                  {fastener.source_kind && (
                    <Badge className={getSourceLabel(fastener.source_kind).color}>
                      {getSourceLabel(fastener.source_kind).label}
                    </Badge>
                  )}
                  {!fastener.source_kind && <Badge variant="secondary">Sample</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <dt className="text-sm font-semibold text-muted-foreground mb-1">Part ID</dt>
                  <dd className="font-mono text-sm text-primary">{fastener.id}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-semibold text-muted-foreground mb-1">Spec Family</dt>
                  <dd>{getFamilyLabel(fastener.family)}</dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-muted-foreground mb-1">Diameter</dt>
                  <dd>{fastener.diameter > 1 ? `${fastener.diameter} mm` : `${fastener.diameter} inch`}</dd>
                </div>

                {fastener.length_mm > 0 && (
                  <div>
                    <dt className="text-sm font-semibold text-muted-foreground mb-1">Length</dt>
                    <dd>{fastener.length_mm} mm</dd>
                  </div>
                )}

                <div>
                  <dt className="text-sm font-semibold text-muted-foreground mb-1">Thread</dt>
                  <dd>{fastener.thread}</dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-muted-foreground mb-1">Material</dt>
                  <dd>{fastener.material}</dd>
                </div>

                {fastener.tensile_strength_mpa && fastener.tensile_strength_mpa > 0 && (
                  <div>
                    <dt className="text-sm font-semibold text-muted-foreground mb-1">Tensile Strength</dt>
                    <dd>{fastener.tensile_strength_mpa} MPa</dd>
                  </div>
                )}

                {fastener.coating && (
                  <div>
                    <dt className="text-sm font-semibold text-muted-foreground mb-1">Coating</dt>
                    <dd>{fastener.coating}</dd>
                  </div>
                )}
              </div>

              {fastener.capabilities.length > 0 && (
                <div>
                  <dt className="text-sm font-semibold text-muted-foreground mb-2">Capabilities</dt>
                  <dd className="flex flex-wrap gap-2">
                    {fastener.capabilities.map((cap) => (
                      <Badge key={cap} variant="outline" className="text-sm">
                        {cap}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}

              {fastener.source_kind && (
                <div className="border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Source Citation</h3>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid gap-3 text-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-semibold mb-1">
                              {fastener.source_kind === 'gov_spec' && 'US Government Specification'}
                              {fastener.source_kind === 'open_library' && 'Open Library'}
                              {fastener.source_kind === 'purchased_std' && 'Purchased Standard'}
                              {fastener.source_kind === 'distributor_ref' && 'Distributor Reference'}
                            </p>
                            {fastener.source_ref && (
                              <p className="text-muted-foreground mb-2">
                                Reference: <span className="font-mono text-xs">{fastener.source_ref}</span>
                              </p>
                            )}
                            {fastener.revision && (
                              <p className="text-muted-foreground mb-2">
                                Revision: {fastener.revision}
                              </p>
                            )}
                            {fastener.license && (
                              <p className="text-muted-foreground mb-2">
                                License: {fastener.license}
                              </p>
                            )}
                            {fastener.confidence && (
                              <p className="text-muted-foreground">
                                Confidence: <Badge variant="outline" className="text-xs">{fastener.confidence}</Badge>
                              </p>
                            )}
                          </div>
                        </div>
                        {fastener.source_url && (
                          <div>
                            <a 
                              href={fastener.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:underline text-sm"
                            >
                              {fastener.source_kind === 'gov_spec' && '→ View on ASSIST QuickSearch'}
                              {fastener.source_kind === 'open_library' && '→ View on BOLTS'}
                              {fastener.source_kind !== 'gov_spec' && fastener.source_kind !== 'open_library' && '→ View Source'}
                            </a>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground italic border-t border-border pt-3">
                          {fastener.source_kind === 'gov_spec' 
                            ? 'Distribution Statement A: Approved for public release; distribution unlimited. Not a substitute for the controlling specification.'
                            : fastener.source_kind === 'open_library'
                            ? 'Open-source dimensional data. Not a substitute for the controlling ISO standard.'
                            : fastener.source_kind === 'purchased_std' && (fastener.license === 'proprietary-cite' || fastener.license === 'proprietary_cite')
                            ? 'Proprietary standard — dimensional extract only. Do not redistribute the source standard. Not a substitute for the controlling specification.'
                            : 'This data is provided for reference only. Always consult the controlling specification.'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {fastener.length_mm > 0 && (
                <ModelSection fastener={fastener} modelExists={modelExists} />
              )}

              <PlacementSection 
                fastener={fastener} 
                modelExists={modelExists} 
                onshapeConfigured={onshapeConfigured}
              />

              <FastenerActions fastener={fastener} />
            </CardContent>
          </Card>
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
