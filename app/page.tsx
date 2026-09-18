import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              AI-Native Fastener Knowledge
            </Badge>
            <h1 className="text-5xl font-bold mb-6 tracking-tight">
              Fastener specifications for AI CAD agents
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Structured fastener data (ISO, AN, MS specs) optimized for AI agents building mechanical assemblies. 
              Query by diameter, length, material, and load requirements.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/search">
                <Button size="lg">
                  Try Sample Search
                </Button>
              </Link>
              <Link href="/mcp">
                <Button size="lg" variant="outline">
                  View MCP Tools
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-accent">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">The Problem</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scattered Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Fastener specs are buried in PDFs, vendor catalogs, and mil-spec documents that AI agents cannot easily query.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Complex Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Choosing the right fastener requires understanding load, environment, material compatibility, and standards.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>No Agent API</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Existing CAD workflows require manual part selection. Agents need structured, queryable fastener knowledge.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">Fastener MCP</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Structured Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Sample dataset covering ISO metric, AN (Army-Navy), and MS (Military Standard) specifications with diameter, length, material, and strength data.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Smart Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Query by requirements (load, environment, dimensions) and get ranked recommendations with reasoning.
                  </CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Agent-Ready API</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    HTTP endpoints designed for MCP tools: list_fasteners, get_fastener, and recommend_fastener.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-muted">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to explore?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Browse the sample dataset or integrate with your AI agent via our MCP tools.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/search">
                <Button size="lg">
                  Browse Fasteners
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              <Badge variant="outline" className="mr-2">SAMPLE DATA</Badge>
              Not a certified mil-spec or aerospace catalog. For demonstration purposes only.
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
