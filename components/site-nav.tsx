import Link from "next/link";
export function SiteNav() {
  return (
    <header className="site-header">
      <nav aria-label="Main navigation">
        <Link className="brand" href="/">
          ⬡ Fastener MCP
        </Link>
        <div className="nav-links">
          <Link href="/search">Catalog</Link>
          <Link href="/parts-list">Parts list</Link>
          <Link href="/mcp">For AI agents</Link>
          <a href="https://github.com/justrocketsci/fastener-mcp">GitHub</a>
        </div>
      </nav>
    </header>
  );
}
