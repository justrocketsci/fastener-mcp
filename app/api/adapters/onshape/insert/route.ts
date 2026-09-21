import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

const ONSHAPE_BASE = 'https://cad.onshape.com';
const DEFAULT_DID = 'f542e957084b482e3f7a1669';
const DEFAULT_WID = '16ea943dbdbd1d73ac65ed3e';

interface OnshapeInsertRequest {
  id: string;
  documentId?: string;
  workspaceId?: string;
}

interface OnshapeInsertResponse {
  ok: boolean;
  elementUrl?: string;
  error?: string;
}

/**
 * Sign an Onshape API request using HMAC-SHA256
 */
function signOnshapeRequest(
  method: string,
  url: string,
  nonce: string,
  date: string,
  contentType: string,
  accessKey: string,
  secretKey: string
): string {
  const urlObj = new URL(url);
  const path = urlObj.pathname || '/';
  const query = urlObj.search.slice(1) || '';

  const payload = `${method}\n${nonce}\n${date}\n${contentType}\n${path}\n${query}\n`.toLowerCase();
  const hmac = createHmac('sha256', secretKey);
  hmac.update(payload);
  const signature = hmac.digest('base64');

  return `On ${accessKey}:HmacSHA256:${signature}`;
}

/**
 * Make an authenticated request to Onshape API
 */
async function onshapeRequest(
  method: string,
  url: string,
  accessKey: string,
  secretKey: string,
  body?: Buffer,
  contentType: string = 'application/json'
): Promise<{ status: number; body: any; headers: Headers }> {
  const nonce = randomBytes(12).toString('hex');
  const date = new Date().toUTCString();
  const auth = signOnshapeRequest(method, url, nonce, date, contentType, accessKey, secretKey);

  const headers: Record<string, string> = {
    'Date': date,
    'On-Nonce': nonce,
    'Authorization': auth,
    'Accept': 'application/json',
  };

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body as BodyInit | null | undefined,
  });

  const responseBody = await response.text();
  let parsedBody;
  try {
    parsedBody = JSON.parse(responseBody);
  } catch {
    parsedBody = responseBody;
  }

  return {
    status: response.status,
    body: parsedBody,
    headers: response.headers,
  };
}

/**
 * Create a multipart/form-data body with file upload
 */
function createMultipartBody(
  fields: Record<string, string>,
  fileField: string,
  filename: string,
  fileBytes: Buffer,
  fileContentType: string = 'application/octet-stream'
): { body: Buffer; contentType: string } {
  const boundary = `----OnshapeBoundary${randomBytes(8).toString('hex')}`;
  const chunks: Buffer[] = [];

  for (const [name, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n`));
    chunks.push(Buffer.from(`${value}\r\n`));
  }

  chunks.push(Buffer.from(`--${boundary}\r\n`));
  chunks.push(Buffer.from(`Content-Disposition: form-data; name="${fileField}"; filename="${filename}"\r\n`));
  chunks.push(Buffer.from(`Content-Type: ${fileContentType}\r\n\r\n`));
  chunks.push(fileBytes);
  chunks.push(Buffer.from(`\r\n`));
  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(chunks);
  const contentType = `multipart/form-data; boundary=${boundary}`;

  return { body, contentType };
}

/**
 * Poll for translation completion
 */
async function pollTranslation(
  translationId: string,
  accessKey: string,
  secretKey: string,
  maxAttempts: number = 40
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const url = `${ONSHAPE_BASE}/api/translations/${translationId}`;
    const response = await onshapeRequest('GET', url, accessKey, secretKey);
    
    const state = response.body.requestState;
    
    if (state === 'DONE') {
      return response.body;
    }
    
    if (state === 'FAILED') {
      throw new Error(`Translation failed: ${response.body.failureReason || 'Unknown reason'}`);
    }
  }
  
  throw new Error('Translation timeout');
}

export async function POST(request: NextRequest): Promise<NextResponse<OnshapeInsertResponse>> {
  try {
    const accessKey = process.env.ONSHAPE_ACCESS_KEY;
    const secretKey = process.env.ONSHAPE_SECRET_KEY;

    if (!accessKey || !secretKey) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Onshape API keys not configured. Set ONSHAPE_ACCESS_KEY and ONSHAPE_SECRET_KEY environment variables.',
        },
        { status: 503 }
      );
    }

    const body: OnshapeInsertRequest = await request.json();
    const { id, documentId = DEFAULT_DID, workspaceId = DEFAULT_WID } = body;

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
    const filename = `${id}.step`;

    const url = `${ONSHAPE_BASE}/api/translations/d/${documentId}/w/${workspaceId}`;
    const { body: multipartBody, contentType } = createMultipartBody(
      {
        storeInDocument: 'true',
        translate: 'true',
        encodedFilename: filename,
        formatName: 'STEP',
        allowFaultyParts: 'true',
      },
      'file',
      filename,
      stepBytes
    );

    const response = await onshapeRequest('POST', url, accessKey, secretKey, multipartBody, contentType);

    if (response.status !== 200 && response.status !== 202) {
      return NextResponse.json(
        {
          ok: false,
          error: `Onshape translation API returned status ${response.status}`,
        },
        { status: 500 }
      );
    }

    const translationId = response.body.id || response.body.translationId;
    
    if (!translationId) {
      const state = response.body.requestState;
      if (state === 'DONE') {
        const elementIds = response.body.resultElementIds || [];
        const elementUrl = elementIds.length > 0
          ? `https://cad.onshape.com/documents/${documentId}/w/${workspaceId}/e/${elementIds[0]}`
          : undefined;
        
        return NextResponse.json({
          ok: true,
          elementUrl,
        });
      }
      
      return NextResponse.json(
        { ok: false, error: 'No translation ID returned and not immediately complete' },
        { status: 500 }
      );
    }

    const result = await pollTranslation(translationId, accessKey, secretKey);

    if (result.requestState === 'DONE') {
      const elementIds = result.resultElementIds || [];
      const elementUrl = elementIds.length > 0
        ? `https://cad.onshape.com/documents/${documentId}/w/${workspaceId}/e/${elementIds[0]}`
        : undefined;

      return NextResponse.json({
        ok: true,
        elementUrl,
      });
    }

    return NextResponse.json(
      { ok: false, error: `Translation failed: ${result.failureReason || 'Unknown'}` },
      { status: 500 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
