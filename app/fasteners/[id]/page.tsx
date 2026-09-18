import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FastenerActions } from './fastener-actions';
import fasteners from '@/data/fasteners.json';
import type { Metadata } from 'next';

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
  const fastener = fasteners.find(f => f.id === id);

  if (!fastener) {
    notFound();
  }

  const getFamilyLabel = (fam: string) => {
    switch (fam) {
      case 'iso':
        return 'ISO Metric';
      case 'an':
        return 'AN (Army-Navy)';
      case 'ms':
        return 'MS (Military Std)';
      default:
        return fam.toUpperCase();
    }
  };

  const getFamilyIllustration = (fam: string) => {
    switch (fam) {
      case 'iso':
        return { src: '/illustrations/hex-bolt.png', alt: 'Flat illustration of a hex head bolt' };
      case 'an':
        return { src: '/illustrations/an-bolt.png', alt: 'Flat illustration of an AN aerospace bolt' };
      case 'ms':
        return { src: '/illustrations/rivet.png', alt: 'Flat illustration of a rivet' };
      default:
        return { src: '/illustrations/hex-bolt.png', alt: 'Flat illustration of a hex head bolt' };
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

          <Alert className="mb-6 bg-muted border-border">
            <AlertDescription className="text-sm text-muted-foreground">
              Sourced open library with dimensional extracts from BOLTS and other open datasets. Not a substitute for controlling ISO/ASME/MIL standards.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  <Image
                    src={getFamilyIllustration(fastener.family).src}
                    alt={getFamilyIllustration(fastener.family).alt}
                    width={200}
                    height={200}
                    className="w-40 h-40 md:w-50 md:h-50 object-contain"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-3xl font-bold font-heading mb-2">
                        {fastener.designation}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {fastener.notes}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{getFamilyLabel(fastener.family)}</Badge>
                      {fastener.source_kind === 'open_library' ? (
                        <Badge variant="default">Open Library</Badge>
                      ) : fastener.source_kind === 'distributor_ref' ? (
                        <Badge variant="secondary">Legacy</Badge>
                      ) : (
                        <Badge variant="outline">{fastener.source_kind}</Badge>
                      )}
                    </div>
                  </div>
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

                {fastener.tensile_strength_mpa > 0 && (
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

              {fastener.source_kind && fastener.source_kind !== 'distributor_ref' && (
                <div className="border-t pt-6 mt-6">
                  <dt className="text-sm font-semibold text-muted-foreground mb-3">Source Citation</dt>
                  <dd className="space-y-2 text-sm">
                    {fastener.standard && (
                      <div>
                        <span className="font-semibold">Standard:</span> {fastener.standard}
                        {fastener.revision && fastener.revision !== 'unknown' && (
                          <span className="text-muted-foreground"> (Rev. {fastener.revision})</span>
                        )}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Source:</span>{' '}
                      {fastener.source_kind === 'open_library' ? 'Open Library' : fastener.source_kind}
                      {' '}<span className="text-muted-foreground">({fastener.source_ref})</span>
                    </div>
                    {fastener.license && (
                      <div>
                        <span className="font-semibold">License:</span>{' '}
                        <Badge variant="outline" className="text-xs">{fastener.license}</Badge>
                      </div>
                    )}
                    {fastener.source_url && (
                      <div>
                        <a 
                          href={fastener.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View upstream source →
                        </a>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground italic mt-2">
                      Dimensional extract only. Not a substitute for the controlling standard.
                    </p>
                  </dd>
                </div>
              )}

              {fastener.source_kind === 'distributor_ref' && (
                <div className="border-t pt-6 mt-6">
                  <dt className="text-sm font-semibold text-muted-foreground mb-3">Legacy Reference</dt>
                  <dd className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">Source:</span>{' '}
                      Distributor reference / sample data
                      {' '}<span className="text-muted-foreground">({fastener.source_ref})</span>
                    </div>
                    <div>
                      <span className="font-semibold">Status:</span>{' '}
                      <Badge variant="secondary" className="text-xs">Legacy sample only</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground italic mt-2">
                      Sample data for demonstration. Not a controlling mil-spec or aerospace source. 
                      Consult official AN/MS specifications and authorized distributors for production use.
                    </p>
                  </dd>
                </div>
              )}

              <FastenerActions fastener={fastener} />
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border py-8 px-4 mt-12">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">MIXED CATALOG</Badge>
              Open-library ISO + legacy AN/MS refs — not a substitute for controlling standards.
            </p>
            <div className="flex gap-4">
              <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">
                Search
              </Link>
              <Link href="/mcp" className="text-sm text-muted-foreground hover:text-foreground">
                MCP Docs
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
