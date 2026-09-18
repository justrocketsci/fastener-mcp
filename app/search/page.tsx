'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Fastener {
  id: string;
  designation: string;
  family: 'iso' | 'an' | 'ms';
  diameter: number;
  length_mm: number;
  thread: string;
  material: string;
  tensile_strength_mpa: number;
  coating: string;
  notes: string;
  capabilities: string[];
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [results, setResults] = useState<Fastener[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);
    setSearched(true);
    
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (family !== 'all') params.append('family', family);
    
    try {
      const response = await fetch(`/api/fasteners?${params}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResults();
  };

  const getFamilyBadgeColor = (fam: string) => {
    switch (fam) {
      case 'iso':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'an':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'ms':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-foreground">
            Fastener MCP
          </Link>
          <nav className="flex gap-6">
            <Link href="/search" className="text-sm font-medium text-foreground">
              Search
            </Link>
            <Link href="/mcp" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              MCP Docs
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6">
            <Badge variant="outline" className="mb-2">
              SAMPLE DATA
            </Badge>
            <h1 className="text-3xl font-bold mb-2">Browse Fasteners</h1>
            <p className="text-muted-foreground">
              Sample dataset for demonstration. Not certified for production use.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mb-8 space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Search by designation, material, or capability..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={family} onValueChange={(value) => setFamily(value || 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Family" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Families</SelectItem>
                  <SelectItem value="iso">ISO Metric</SelectItem>
                  <SelectItem value="an">AN (Army-Navy)</SelectItem>
                  <SelectItem value="ms">MS (Military Std)</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </form>

          {searched && (
            <>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Found {results.length} fastener{results.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((fastener) => (
                  <Card key={fastener.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-lg">{fastener.designation}</CardTitle>
                        <Badge className={getFamilyBadgeColor(fastener.family)}>
                          {fastener.family.toUpperCase()}
                        </Badge>
                      </div>
                      <CardDescription>{fastener.notes}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Diameter:</span>
                          <div className="font-medium">{fastener.diameter}mm</div>
                        </div>
                        {fastener.length_mm > 0 && (
                          <div>
                            <span className="text-muted-foreground">Length:</span>
                            <div className="font-medium">{fastener.length_mm}mm</div>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Thread:</span>
                          <div className="font-medium">{fastener.thread}</div>
                        </div>
                        {fastener.tensile_strength_mpa > 0 && (
                          <div>
                            <span className="text-muted-foreground">Strength:</span>
                            <div className="font-medium">{fastener.tensile_strength_mpa} MPa</div>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <span className="text-sm text-muted-foreground">Material:</span>
                        <div className="text-sm font-medium">{fastener.material}</div>
                      </div>

                      {fastener.coating && (
                        <div>
                          <span className="text-sm text-muted-foreground">Coating:</span>
                          <div className="text-sm font-medium">{fastener.coating}</div>
                        </div>
                      )}

                      {fastener.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {fastener.capabilities.map((cap) => (
                            <Badge key={cap} variant="secondary" className="text-xs">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {results.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No fasteners found. Try adjusting your search.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-8 px-4 mt-12">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">SAMPLE DATA</Badge>
              Not a certified mil-spec or aerospace catalog.
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
