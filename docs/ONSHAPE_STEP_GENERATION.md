# Onshape STEP Generation Guide

## ⚠️ IMPORTANT: Real BREP Geometry Required

This repository does NOT ship with placeholder STEP files. Engineer must run the generation script with valid Onshape API credentials to create actual MANIFOLD_SOLID_BREP geometry.

## Overview

The `scripts/generate-onshape-step.py` script uses Onshape's REST API to:
1. Create/access Part Studio elements in an Onshape document
2. Add parametric features (cylinders, extrudes) from catalog dimensions
3. Export BREP STEP files with real solid geometry
4. Save files to `public/models/` for the API to serve

## Prerequisites

### 1. Onshape API Keys

Get your API credentials:

1. Log in to [Onshape](https://cad.onshape.com)
2. Account settings (top-right) → **API Keys**
3. **Create new API key**
4. Save Access Key and Secret Key

**⚠️ NEVER commit API keys to the repository**

### 2. Onshape Document

You need a document where the script can create Part Studio geometry:

**Option A: Use existing document**
```bash
export ONSHAPE_DOCUMENT_ID='your_document_id'
export ONSHAPE_WORKSPACE_ID='your_workspace_id'
```

**Option B: Create new document via API**
```bash
python3 scripts/generate-onshape-step.py --create-document
```

### 3. Required Python Packages

```bash
pip3 install requests
```

For advanced usage with proper FeatureScript feature addition:
```bash
pip3 install onshape-client
```

## Usage

### Set Environment Variables

```bash
export ONSHAPE_ACCESS_KEY='your_access_key_here'
export ONSHAPE_SECRET_KEY='your_secret_key_here'
export ONSHAPE_DOCUMENT_ID='your_document_id'
export ONSHAPE_WORKSPACE_ID='your_workspace_id'
```

### Run STEP Generation

```bash
cd /path/to/fastener-mcp
python3 scripts/generate-onshape-step.py
```

This will:
- Connect to Onshape with your credentials
- Access the specified document/workspace
- Create Part Studio geometry for each fastener
- Export STEP files with MANIFOLD_SOLID_BREP
- Save to `public/models/*.step`

### Verify STEP Files

Check that generated STEP files contain real geometry:

```bash
# Should see MANIFOLD_SOLID_BREP, CARTESIAN_POINT, etc.
grep -i "MANIFOLD_SOLID_BREP\|CARTESIAN_POINT" public/models/iso-4017-m6-30.step
```

Empty files (only HEADER/APPLICATION_CONTEXT) are NOT valid.

## Implementation Approaches

### Approach 1: Manual Part Studio + Script Export (RECOMMENDED)

This is the most reliable approach for production:

1. **Create Part Studio manually in Onshape**
   - Open your document in Onshape
   - Create a Part Studio
   - Add a few fastener geometries as examples

2. **Use configurations for variants**
   - Create configuration variables for diameter, length, head type
   - Single parametric model with configurations

3. **Export via script**
   - Use the export API to download STEP for each configuration
   - Much simpler than programmatic feature addition

### Approach 2: Onshape Python Client Library

Use Onshape's official Python client:

```bash
pip3 install onshape-client
```

```python
from onshape_client.client import Client

client = Client(
    configuration={
        "access_key": os.environ['ONSHAPE_ACCESS_KEY'],
        "secret_key": os.environ['ONSHAPE_SECRET_KEY']
    }
)

# Use client methods to add features, export STEP
```

See: https://github.com/onshape-public/onshape-clients

### Approach 3: REST API Feature Addition (ADVANCED)

The current script demonstrates the REST API structure but requires completing the feature addition logic. This is complex because:

- Onshape features use FeatureScript
- Feature definitions require specific JSON schema
- Requires understanding Onshape's internal feature representation

For production, prefer Approach 1 or 2.

## Expected STEP File Structure

Valid STEP files should contain:

```
ISO-10303-21;
HEADER;
...
ENDSEC;
DATA;
#1=APPLICATION_CONTEXT('automotive design');
...
#45=MANIFOLD_SOLID_BREP('',#123);
...
#67=CARTESIAN_POINT('',(0.0, 0.0, 0.0));
...
ENDSEC;
END-ISO-10303-21;
```

## Troubleshooting

### Authentication Errors (401 Unauthorized)

- Verify API keys are correct
- Check keys are exported as environment variables
- Ensure Onshape account has API access enabled

### Document Access Errors (403 Forbidden)

- Verify you own the document or have edit access
- Check document ID and workspace ID are correct
- Ensure document is not deleted

### Rate Limiting (429 Too Many Requests)

The script includes delays between requests. If you hit limits:
- Reduce batch size
- Increase `time.sleep()` delays
- Contact Onshape support for higher limits

### Empty STEP Files Generated

If STEP files are generated but contain no geometry:
- Check Part Studio has actual solid bodies
- Verify export API is returning binary STEP content
- Ensure part IDs are correct in export call

### No Part Studio Found

Create a Part Studio in your Onshape document:
1. Open document in browser
2. Insert → Part Studio
3. Name it (e.g., "Fastener Models")
4. Note the element ID from URL or API

## Alternative: Manual Export Workflow

If automated generation is blocked, you can generate STEP files manually:

1. Create fastener models in Onshape Part Studio
2. File → Export → STEP for each part
3. Download STEP files
4. Place in `public/models/*.step`
5. Commit to repository

This is acceptable for small catalogs (< 100 fasteners).

## Production Recommendations

1. **Pre-generate STEP files** - Don't generate on-demand
2. **Version control models** - Commit STEP files to repo (or use LFS)
3. **Validate exports** - Check for MANIFOLD_SOLID_BREP in each file
4. **Automate testing** - Verify STEP files parse correctly
5. **Document provenance** - Track which Onshape document generated each file

## Security

- **Never commit API keys** to version control
- Store keys in environment variables or secrets manager
- Use read-only API keys if possible
- Rotate keys periodically

## References

- [Onshape API Documentation](https://onshape-public.github.io/docs/)
- [Onshape Python Client](https://github.com/onshape-public/onshape-clients)
- [Onshape FeatureScript](https://cad.onshape.com/FsDoc/)
- [ISO 10303-21 STEP Format](https://en.wikipedia.org/wiki/ISO_10303-21)

## Support

For Onshape API issues:
- [Onshape API Forum](https://forum.onshape.com/categories/api)
- [Onshape Support](https://support.onshape.com/)

For this script:
- Check issues in the repository
- Review documentation in `/docs`
