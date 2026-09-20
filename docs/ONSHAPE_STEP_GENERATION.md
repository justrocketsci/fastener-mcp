# Onshape STEP Generation

This document explains how to generate high-quality BREP STEP files for fasteners using Onshape's geometry engine.

## Overview

The `scripts/generate-onshape-step.py` script uses the Onshape REST API to:
1. Create parametric fastener geometry in Part Studios
2. Export BREP STEP files (boundary representation)
3. Store files in `public/models/` for serving via the API

## Prerequisites

### Onshape API Keys

You need Onshape API credentials:

1. Log in to [Onshape](https://cad.onshape.com)
2. Go to your account settings (top-right menu)
3. Navigate to **API Keys** section
4. Click **Create new API key**
5. Save the Access Key and Secret Key securely

**⚠️ NEVER commit API keys to the repository**

### Environment Variables

Set these environment variables before running the script:

```bash
export ONSHAPE_ACCESS_KEY='your_access_key_here'
export ONSHAPE_SECRET_KEY='your_secret_key_here'
```

## Usage

### Generate STEP Files

Run the script from the workspace root:

```bash
python3 scripts/generate-onshape-step.py
```

This will:
- Load fasteners from `data/fasteners.json`
- Create/update geometry in Onshape Part Studios
- Export STEP files to `public/models/`
- Skip fasteners with `length_mm = 0` (nuts, washers)

### Testing Without API Keys

If API keys are not set, the script will generate minimal placeholder STEP files for testing the application UI and API routes:

```bash
python3 scripts/generate-onshape-step.py
```

These placeholder files are minimal ISO 10303-21 STEP files that parse correctly but contain no actual geometry. Replace with real Onshape exports for production.

## Architecture

### Onshape REST API

The script uses Onshape's REST API v6 with HMAC-based authentication:

```python
from onshape_client import OnshapeClient

client = OnshapeClient(access_key, secret_key)
step_content = client.export_step(
    document_id="your_document_id",
    workspace_id="your_workspace_id",
    element_id="part_studio_element_id"
)
```

### Parametric Geometry Creation

**Current Status:** Template implementation

The script demonstrates the authentication and export flow. For production use, you need to implement FeatureScript API calls to create parametric geometry:

1. **Create Part Studio** - Add a new Part Studio element to the document
2. **Add Features** - Use FeatureScript API to create:
   - Cylindrical shaft (extrude from circle sketch)
   - Head geometry (hex, socket, pan, etc.)
   - Thread features (cosmetic or modeled)
3. **Regenerate** - Rebuild the feature tree
4. **Export STEP** - Download BREP STEP file

See [Onshape API Explorer](https://cad.onshape.com/glassworks/explorer) for details.

## Test Document

The default test document referenced in the script:
- **Document ID:** `f542e957084b482e3f7a1669`
- **Workspace ID:** `16ea943dbdbd1d73ac65ed3e`

You may need to create your own test document and update these IDs.

## Output Format

Generated STEP files:
- **Format:** ISO 10303-21 (STEP AP214 or AP242)
- **Encoding:** ASCII
- **Geometry:** BREP (boundary representation) from Onshape's geometry kernel
- **Naming:** `{fastener_id}.step` (e.g., `iso-4017-m6-30.step`)

## Disclaimer

⚠️ **NOT FOR CERTIFICATION**

Generated STEP files are approximate representations derived from catalog dimensions. They are suitable for:
- CAD drop-in and assembly previews
- Agent-driven design workflows
- Rapid prototyping

They are **NOT** suitable for:
- Engineering analysis (FEA, stress testing)
- Manufacturing with tight tolerances
- Certified aerospace/defense applications

**Always consult the controlling specification** (ISO, AN, MS, NAS standards) for certified dimensions and tolerances.

## Troubleshooting

### Authentication Errors

If you see `401 Unauthorized`:
- Verify your API keys are correct
- Check that keys are set as environment variables
- Ensure your Onshape account has API access enabled

### Rate Limiting

Onshape API has rate limits. The script includes `time.sleep(0.5)` delays between requests. If you hit rate limits:
- Reduce batch size
- Increase delay between requests
- Contact Onshape support for higher limits

### Missing Geometry

If exports fail with "Part not found":
- Ensure the Part Studio element exists
- Verify feature creation succeeded
- Check document/workspace IDs are correct

## Production Recommendations

1. **Batch Processing** - Generate STEP files as a build step, not on-demand
2. **Caching** - Store generated files in version control or object storage
3. **Validation** - Verify STEP files parse correctly after generation
4. **Error Handling** - Log failures and retry with exponential backoff
5. **Documentation** - Maintain a mapping of fastener IDs to Onshape Part Studio elements

## References

- [Onshape API Documentation](https://onshape-public.github.io/docs/)
- [Onshape API Explorer](https://cad.onshape.com/glassworks/explorer)
- [ISO 10303-21 STEP Format](https://en.wikipedia.org/wiki/ISO_10303-21)
- [Fastener Standards](https://www.fasteners.eu/)
