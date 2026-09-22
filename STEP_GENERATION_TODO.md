> Historical document. This workflow is retired; see the current README and docs/MIGRATION.md for the portable CadQuery/MCP workflow.

# ⚠️ STEP File Generation Required

This repository **does NOT include pre-generated STEP files**. Engineer must run the generation script with Onshape API credentials to create actual BREP geometry.

## Current State

- ✅ UI updated: Strength/Status columns removed from search
- ✅ Product surface: STEP download endpoints (no STL references)
- ✅ API: `/api/fasteners/[id]/model` serves STEP format
- ✅ Script: `scripts/generate-onshape-step.py` ready for Onshape API
- ❌ **STEP files NOT generated** (returns 404 until Engineer runs script with keys)

## Engineer Action Required

### 1. Get Onshape API Keys

1. Log in to [Onshape](https://cad.onshape.com)
2. Account settings → **API Keys**
3. Create new API key pair
4. Save Access Key and Secret Key

### 2. Set Environment Variables

```bash
export ONSHAPE_ACCESS_KEY='your_access_key_here'
export ONSHAPE_SECRET_KEY='your_secret_key_here'
export ONSHAPE_DOCUMENT_ID='your_document_id'
export ONSHAPE_WORKSPACE_ID='your_workspace_id'
```

### 3. Generate STEP Files

```bash
python3 scripts/generate-onshape-step.py
```

### 4. Verify STEP Files Contain BREP Geometry

```bash
# Should see MANIFOLD_SOLID_BREP, CARTESIAN_POINT, EDGE_CURVE, etc.
grep -i "MANIFOLD_SOLID_BREP" public/models/*.step

# Should NOT be empty placeholders (only HEADER + APPLICATION_CONTEXT)
wc -l public/models/*.step  # Real STEP files are 100s-1000s of lines
```

### 5. Commit Real STEP Files (Optional)

If catalog is small (< 100 fasteners), commit STEP files to repo:

```bash
git add public/models/*.step
git commit -m "Add Onshape-generated BREP STEP files"
git push origin main
```

For large catalogs, use Git LFS or serve from object storage.

## Implementation Approaches

See [`docs/ONSHAPE_STEP_GENERATION.md`](docs/ONSHAPE_STEP_GENERATION.md) for detailed implementation options:

1. **Manual Part Studio + Script Export** (RECOMMENDED)
2. **Onshape Python Client Library**
3. **REST API Feature Addition** (advanced)

## What Was NOT Shipped

This commit removed placeholder STEP files that contained no actual geometry:

```
- public/models/*.step (20 files deleted)
```

These were empty ISO 10303-21 files with only:
- HEADER section
- APPLICATION_CONTEXT
- **NO MANIFOLD_SOLID_BREP**
- **NO CARTESIAN_POINT**
- **NO actual geometry**

Such files are NOT valid for the product requirement.

## How the App Handles Missing STEP Files

Until Engineer generates real STEP files:

- `/api/fasteners/[id]/model` returns **404 Not Found**
- UI shows "Model not generated yet"
- Search and detail pages work normally
- Build passes (`npm run build` ✓)

This is acceptable until Onshape script runs successfully with real API keys.

## References

- [Onshape STEP Generation Guide](docs/ONSHAPE_STEP_GENERATION.md)
- [Onshape API Documentation](https://onshape-public.github.io/docs/)
- [Onshape Python Client](https://github.com/onshape-public/onshape-clients)
