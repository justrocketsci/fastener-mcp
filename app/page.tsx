import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Home() {
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

      <main className="flex-1">
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <Alert className="mb-8 bg-muted border-border">
              <AlertDescription className="text-sm text-muted-foreground">
                Sample catalog for demo — not a certified mil/aerospace source.
              </AlertDescription>
            </Alert>
            
            <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
              <div>
                <h1 className="text-5xl font-bold mb-6 tracking-tight font-heading">
                  Fastener specifications for AI CAD agents
                </h1>
                <p className="text-xl text-muted-foreground mb-8">
                  Structured fastener data (ISO, AN, MS specs) optimized for AI agents building mechanical assemblies. 
                  Query by diameter, length, material, and load requirements.
                </p>
                <div className="flex gap-4 mb-8">
                  <Link href="/search">
                    <Button size="lg">
                      Try Sample Search
                    </Button>
                  </Link>
                  <Link href="/mcp">
                    <Button size="lg" variant="outline">
                      MCP Docs
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/search?q=M6">
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                      M6 × 20 ISO
                    </Badge>
                  </Link>
                  <Link href="/search?q=AN3">
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                      AN3
                    </Badge>
                  </Link>
                  <Link href="/search?q=MS24693">
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                      MS24693
                    </Badge>
                  </Link>
                </div>
              </div>
              
              <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] p-8 flex items-center justify-center">
                <Image
                  src="/illustrations/hero-composition.png"
                  alt="Flat illustration composition of various fasteners including hex bolts and screws"
                  width={768}
                  height={512}
                  className="max-h-[400px] w-auto object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-accent">
          <div className="container mx-auto max-w-5xl">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <div className="mb-4 flex justify-center">
                    <Image
                      src="/illustrations/hex-bolt.png"
                      alt="Flat illustration of a hex head bolt"
                      width={80}
                      height={80}
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                  <CardTitle>Search by Size & Spec</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Query fasteners by diameter, length, thread specification, and material. Filters for ISO metric, AN, and MS families.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="mb-4 flex justify-center">
                    <Image
                      src="/illustrations/socket-screw.png"
                      alt="Flat illustration of a socket head cap screw"
                      width={80}
                      height={80}
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                  <CardTitle>Spec Families</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    ISO metric standards, AN (Army-Navy) aerospace hardware, and MS (Military Standard) specifications represented in sample set.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="mb-4 flex justify-center">
                    <Image
                      src="/illustrations/an-bolt.png"
                      alt="Flat illustration of an AN aerospace bolt"
                      width={80}
                      height={80}
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                  <CardTitle>Agent-Ready JSON API</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    RESTful HTTP endpoints with structured responses. Search, retrieve by ID, and get intelligent recommendations.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">SAMPLE DATA</Badge>
              Sample catalog for demo — not a certified mil/aerospace source.
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
