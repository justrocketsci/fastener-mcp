'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  standard?: string;
  revision?: string;
  source_kind?: string;
  source_ref?: string;
  license?: string;
  source_url?: string;
  citation?: {
    standard?: string;
    revision?: string;
    source_kind: string;
    source_ref: string;
    license: string;
    source_url?: string;
  };
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

  const getFamilyLabel = (fam: string) => {
    switch (fam) {
      case 'iso':
        return 'ISO';
      case 'an':
        return 'AN';
      case 'ms':
        return 'MS';
      default:
        return fam.toUpperCase();
    }
  };

  const getStrengthNote = (fastener: Fastener) => {
    if (fastener.tensile_strength_mpa > 0) {
      return `${fastener.tensile_strength_mpa} MPa`;
    }
    if (fastener.capabilities.includes('high-strength')) {
      return 'High strength';
    }
    return '—';
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
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
          
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input
              placeholder="Search by designation, material, or capability..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={family} onValueChange={(value) => setFamily(value || 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Spec Family" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="iso">ISO</SelectItem>
                <SelectItem value="an">AN</SelectItem>
                <SelectItem value="ms">MS</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <Alert className="mb-6 bg-muted border-border">
            <AlertDescription className="text-sm text-muted-foreground">
              Sourced open library with dimensional extracts from BOLTS and other open datasets. Not a substitute for controlling ISO/ASME/MIL standards.
            </AlertDescription>
          </Alert>

          {searched && (
            <>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Found {results.length} fastener{results.length !== 1 ? 's' : ''} in sample set
                </p>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-lg border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Part ID</TableHead>
                      <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Spec</TableHead>
                      <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Diameter</TableHead>
                      <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Length</TableHead>
                      <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Material</TableHead>
                      <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Strength</TableHead>
                      <TableHead className="text-xs uppercase text-muted-foreground font-semibold">Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-4">
                            <Image
                              src="/illustrations/hex-bolt.png"
                              alt="Flat illustration of a hex head bolt"
                              width={120}
                              height={120}
                              className="w-30 h-30 object-contain opacity-50"
                            />
                            <p className="text-muted-foreground">No matches in sample set — try M6 or AN3</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      results.map((fastener) => (
                        <TableRow 
                          key={fastener.id}
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => window.location.href = `/fasteners/${fastener.id}`}
                        >
                          <TableCell className="font-mono text-sm text-primary">
                            {fastener.id}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{fastener.designation}</span>
                              <Badge variant="outline" className="text-xs">
                                {getFamilyLabel(fastener.family)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {fastener.diameter > 1 ? `${fastener.diameter}mm` : `${fastener.diameter}"`}
                          </TableCell>
                          <TableCell className="text-sm">
                            {fastener.length_mm > 0 ? `${fastener.length_mm}mm` : '—'}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {fastener.material}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getStrengthNote(fastener)}
                          </TableCell>
                          <TableCell>
                            {fastener.source_kind === 'open_library' ? (
                              <Badge variant="default" className="text-xs">Open Library</Badge>
                            ) : fastener.source_kind === 'distributor_ref' ? (
                              <Badge variant="secondary" className="text-xs">Legacy</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">{fastener.source_kind}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {results.length === 0 ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Image
                          src="/illustrations/hex-bolt.png"
                          alt="Flat illustration of a hex head bolt"
                          width={120}
                          height={120}
                          className="w-30 h-30 object-contain opacity-50"
                        />
                        <p className="text-center text-muted-foreground">No matches in sample set — try M6 or AN3</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  results.map((fastener) => (
                    <Link href={`/fasteners/${fastener.id}`} key={fastener.id}>
                      <Card className="cursor-pointer hover:bg-accent">
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-mono text-sm text-primary">{fastener.id}</p>
                                <p className="font-semibold">{fastener.designation}</p>
                              </div>
                              {fastener.source_kind === 'open_library' ? (
                                <Badge variant="default" className="text-xs">Open Library</Badge>
                              ) : fastener.source_kind === 'distributor_ref' ? (
                                <Badge variant="secondary" className="text-xs">Legacy</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">{fastener.source_kind}</Badge>
                              )}
                            </div>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>Ø{fastener.diameter > 1 ? `${fastener.diameter}mm` : `${fastener.diameter}"`}</span>
                              {fastener.length_mm > 0 && <span>L{fastener.length_mm}mm</span>}
                              <Badge variant="outline" className="text-xs">
                                {getFamilyLabel(fastener.family)}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-8 px-4 mt-12">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">OPEN LIBRARY</Badge>
              Sourced dimensional data — not a substitute for controlling standards.
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
