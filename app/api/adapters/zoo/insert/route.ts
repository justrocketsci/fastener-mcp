import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { validateWriteKey } from '@/lib/auth';

const ZOO_API_BASE = 'https://api.zoo.dev';

interface ZooInsertRequest {
  id: string;
}

interface ZooInsertResponse {
  ok: boolean;
  id?: string;
  projectId?: string;
  zooUrl?: string;
  shareUrl?: string;
  error?: string;
}

/**
 * Create a multipart/form-data body for Zoo project upload
 */
function createZooMultipartBody(
  projectJson: { title: string; description: string },
  files: Array<{ name: string; content: Buffer; contentType?: string }>
): { body: Buffer; contentType: string } {
  const boundary = `----ZooBoundary${randomBytes(8).toString('hex')}`;
  const chunks: Buffer[] = [];

  chunks.push(Buffer.from(`--${boundary}\r\n`));
  chunks.push(Buffer.from(`Content-Disposition: form-data; name="body"; filename="body.json"\r\n`));
  chunks.push(Buffer.from(`Content-Type: application/json\r\n\r\n`));
  chunks.push(Buffer.from(JSON.stringify(projectJson)));
  chunks.push(Buffer.from(`\r\n`));

  for (const file of files) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${file.name}"; filename="${file.name}"\r\n`));
    const contentType = file.contentType || 'application/octet-stream';
    chunks.push(Buffer.from(`Content-Type: ${contentType}\r\n\r\n`));
    chunks.push(file.content);
    chunks.push(Buffer.from(`\r\n`));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(chunks);
  const contentType = `multipart/form-data; boundary=${boundary}`;

  return { body, contentType };
}

export async function POST(request: NextRequest): Promise<NextResponse<ZooInsertResponse>> {
  try {
    // Validate write key (fail closed)
    const authResult = validateWriteKey(request.headers);
    if (!authResult.authenticated) {
      return NextResponse.json(
        {
          ok: false,
          error: authResult.error,
        },
        { status: authResult.status }
      );
    }

    const apiToken = process.env.ZOO_API_TOKEN;

    if (!apiToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'ZOO_API_TOKEN missing',
        },
        { status: 503 }
      );
    }

    const body: ZooInsertRequest = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const stepPath = path.join(process.cwd(), 'public', 'models', `${id}.step`);
    if (!fs.existsSync(stepPath)) {
      return NextResponse.json(
        { ok: false, error: `STEP file not found for fastener: ${id}` },
        { status: 404 }
      );
    }

    const stepBytes = fs.readFileSync(stepPath);
    const stepFilename = `${id}.step`;

    const projectTomlContent = `[project]
name = "${id}"
version = "0.1.0"
authors = []

[dependencies]

[project.urls]
`;

    // KCL requires identifiers without hyphens, spaces, etc.
    // Use 'as fastener' to create a safe identifier for the imported STEP
    const mainKclContent = `import "${stepFilename}" as fastener

fastener
`;

    const { body: multipartBody, contentType } = createZooMultipartBody(
      {
        title: `Fastener: ${id}`,
        description: `Auto-inserted fastener ${id} from fastener-mcp catalog`,
      },
      [
        {
          name: 'project.toml',
          content: Buffer.from(projectTomlContent),
          contentType: 'text/plain',
        },
        {
          name: stepFilename,
          content: stepBytes,
          contentType: 'application/octet-stream',
        },
        {
          name: 'main.kcl',
          content: Buffer.from(mainKclContent),
          contentType: 'text/plain',
        },
      ]
    );

    const createResponse = await fetch(`${ZOO_API_BASE}/user/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': contentType,
      },
      body: new Uint8Array(multipartBody),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      return NextResponse.json(
        {
          ok: false,
          error: `Zoo API returned status ${createResponse.status}: ${errorText}`,
        },
        { status: 500 }
      );
    }

    const projectResponse = await createResponse.json();
    const projectId = projectResponse.id;

    if (!projectId) {
      return NextResponse.json(
        { ok: false, error: 'No project ID returned from Zoo API' },
        { status: 500 }
      );
    }

    let shareUrl: string | undefined;
    try {
      const shareLinkResponse = await fetch(`${ZOO_API_BASE}/user/projects/${projectId}/share-links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_mode: 'anyone_with_link' }),
      });

      if (shareLinkResponse.ok) {
        const shareLinkData = await shareLinkResponse.json();
        shareUrl = shareLinkData.url;
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
    }

    const zooUrl = shareUrl || `https://zoo.dev/projects/${projectId}`;

    return NextResponse.json({
      ok: true,
      id,
      projectId,
      zooUrl,
      shareUrl,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
