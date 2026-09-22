import Link from "next/link";
export default function Retired() {
  return (
    <main className="site-main">
      <h1>The Onshape panel has been retired</h1>
      <p>Use portable STEP models and the read-only MCP endpoint.</p>
      <Link className="primary-button" href="/mcp">
        Open the MCP guide
      </Link>
    </main>
  );
}
