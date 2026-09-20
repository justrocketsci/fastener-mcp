#!/usr/bin/env python3
"""
Generate BREP STEP files using Onshape's geometry engine.

Uses Onshape REST API to create parametric fastener geometry in a Part Studio
and export high-quality STEP files. Requires Onshape API keys.

Environment Variables:
    ONSHAPE_ACCESS_KEY: Onshape API access key
    ONSHAPE_SECRET_KEY: Onshape API secret key

Usage:
    export ONSHAPE_ACCESS_KEY="your_access_key"
    export ONSHAPE_SECRET_KEY="your_secret_key"
    python3 scripts/generate-onshape-step.py

NOT FOR CERTIFICATION: Generated models are approximate representations from
catalog dimensions. Always consult controlling specifications.
"""

import os
import sys
import json
import time
import hmac
import hashlib
import base64
import requests
from urllib.parse import urlparse, parse_qs
from datetime import datetime
from pathlib import Path

# Onshape API Configuration
ONSHAPE_BASE_URL = "https://cad.onshape.com"
ONSHAPE_API_VERSION = "/api/v6"

# Test document from handoff (you may need to create your own)
# Document: f542e957084b482e3f7a1669
# Workspace: 16ea943dbdbd1d73ac65ed3e
DEFAULT_DOCUMENT_ID = "f542e957084b482e3f7a1669"
DEFAULT_WORKSPACE_ID = "16ea943dbdbd1d73ac65ed3e"


class OnshapeClient:
    """Onshape REST API client with HMAC authentication."""
    
    def __init__(self, access_key: str, secret_key: str, base_url: str = ONSHAPE_BASE_URL):
        self.access_key = access_key
        self.secret_key = secret_key
        self.base_url = base_url
    
    def _make_auth_header(self, method: str, path: str, query: dict, nonce: str, date: str) -> str:
        """Generate HMAC-based authorization header."""
        query_string = '&'.join(f"{k}={v}" for k, v in sorted(query.items())) if query else ''
        
        string_to_sign = '\n'.join([
            method.upper(),
            nonce,
            date,
            'application/json',
            path,
            query_string,
            ''
        ])
        
        signature = base64.b64encode(
            hmac.new(
                self.secret_key.encode('utf-8'),
                string_to_sign.encode('utf-8'),
                digestmod=hashlib.sha256
            ).digest()
        ).decode('utf-8')
        
        return f"On {self.access_key}:HmacSHA256:{signature}"
    
    def request(self, method: str, endpoint: str, query: dict = None, body: dict = None) -> requests.Response:
        """Make authenticated request to Onshape API."""
        url = f"{self.base_url}{ONSHAPE_API_VERSION}{endpoint}"
        parsed = urlparse(url)
        
        nonce = base64.b64encode(os.urandom(16)).decode('utf-8')
        date = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S GMT')
        
        headers = {
            'Content-Type': 'application/json',
            'Date': date,
            'On-Nonce': nonce,
            'Authorization': self._make_auth_header(
                method, 
                parsed.path, 
                query or {},
                nonce,
                date
            ),
            'Accept': 'application/json'
        }
        
        response = requests.request(
            method,
            url,
            headers=headers,
            params=query,
            json=body
        )
        
        return response
    
    def create_part_studio(self, document_id: str, workspace_id: str, name: str) -> dict:
        """Create a new Part Studio in a document."""
        endpoint = f"/partstudios/d/{document_id}/w/{workspace_id}"
        body = {"name": name}
        response = self.request("POST", endpoint, body=body)
        response.raise_for_status()
        return response.json()
    
    def add_feature(self, document_id: str, workspace_id: str, element_id: str, feature_script: dict) -> dict:
        """Add a feature to a Part Studio using FeatureScript."""
        endpoint = f"/partstudios/d/{document_id}/w/{workspace_id}/e/{element_id}/features"
        response = self.request("POST", endpoint, body=feature_script)
        response.raise_for_status()
        return response.json()
    
    def export_step(self, document_id: str, workspace_id: str, element_id: str, part_id: str = None) -> bytes:
        """Export a part as STEP file."""
        endpoint = f"/partstudios/d/{document_id}/w/{workspace_id}/e/{element_id}/step"
        query = {}
        if part_id:
            query['partIds'] = part_id
        
        response = self.request("GET", endpoint, query=query)
        response.raise_for_status()
        return response.content


def load_fasteners_catalog() -> list:
    """Load fasteners from the JSON catalog."""
    catalog_path = Path(__file__).parent.parent / "data" / "fasteners.json"
    with open(catalog_path, 'r') as f:
        return json.load(f)


def generate_bolt_featurescript(fastener: dict) -> dict:
    """
    Generate FeatureScript JSON for a bolt/screw.
    
    This is a simplified approach. In production, you would:
    1. Use proper Onshape FeatureScript API
    2. Define cylinder + extrude operations
    3. Add proper threading features (cosmetic or actual)
    4. Model head geometry accurately
    
    For now, this creates basic cylindrical geometry.
    """
    diameter_mm = fastener['diameter'] if fastener['diameter'] > 1 else fastener['diameter'] * 25.4
    length_mm = fastener['length_mm']
    
    # Basic cylinder sketch + extrude
    # Note: Actual Onshape FeatureScript API is more complex
    # This is a placeholder structure - you'll need to consult Onshape API docs
    feature = {
        "btType": "BTMFeature-134",
        "feature": {
            "btType": "BTMSketch-151",
            "name": f"Sketch_{fastener['id']}",
            "entities": [
                {
                    "btType": "BTMSketchCircle-133",
                    "radius": diameter_mm / 2,
                    "center": {"x": 0, "y": 0}
                }
            ]
        },
        "extrude": {
            "btType": "BTMFeature-134",
            "name": f"Extrude_{fastener['id']}",
            "depth": length_mm,
            "direction": "FORWARD"
        }
    }
    
    return feature


def generate_step_files_onshape(
    access_key: str,
    secret_key: str,
    document_id: str = DEFAULT_DOCUMENT_ID,
    workspace_id: str = DEFAULT_WORKSPACE_ID,
    limit: int = None
):
    """
    Generate STEP files for fasteners using Onshape API.
    
    WARNING: This is a template implementation. The actual Onshape FeatureScript
    API for creating parametric geometry requires deeper integration with their
    feature system. This demonstrates the authentication and export flow.
    
    For production use:
    1. Study Onshape FeatureScript API documentation
    2. Create proper parametric features (sketches, extrudes, revolves)
    3. Handle different fastener types (bolts, nuts, washers)
    4. Add proper error handling and retry logic
    """
    client = OnshapeClient(access_key, secret_key)
    fasteners = load_fasteners_catalog()
    
    # Filter to only fasteners with length > 0 (skip nuts/washers for this example)
    fasteners = [f for f in fasteners if f.get('length_mm', 0) > 0]
    
    if limit:
        fasteners = fasteners[:limit]
    
    output_dir = Path(__file__).parent.parent / "public" / "models"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating STEP files for {len(fasteners)} fasteners...")
    print(f"Using Onshape document: {document_id}")
    print(f"Workspace: {workspace_id}")
    print()
    
    generated = 0
    skipped = 0
    
    for i, fastener in enumerate(fasteners, 1):
        fastener_id = fastener['id']
        print(f"[{i}/{len(fasteners)}] Processing {fastener_id}...", end=' ')
        
        try:
            # In a real implementation, you would:
            # 1. Create or reuse a Part Studio element
            # 2. Add parametric features via FeatureScript API
            # 3. Regenerate the part
            # 4. Export as STEP
            
            # For this template, we're showing the export step only
            # You need to first create the geometry in Onshape
            
            # Placeholder: This assumes parts already exist in the document
            # In practice, you'd create them programmatically
            
            # Export STEP (this will fail if the part doesn't exist)
            # step_content = client.export_step(
            #     document_id=document_id,
            #     workspace_id=workspace_id,
            #     element_id="YOUR_PART_STUDIO_ELEMENT_ID",
            #     part_id=fastener_id
            # )
            
            # output_path = output_dir / f"{fastener_id}.step"
            # with open(output_path, 'wb') as f:
            #     f.write(step_content)
            
            # generated += 1
            # print("✓")
            
            print("SKIPPED (template - needs Part Studio setup)")
            skipped += 1
            
        except Exception as e:
            print(f"ERROR: {e}")
            skipped += 1
        
        # Rate limiting
        time.sleep(0.5)
    
    print()
    print(f"Complete: {generated} generated, {skipped} skipped")
    return generated, skipped


def create_sample_step_file(fastener_id: str, diameter: float, length_mm: float, output_path: Path):
    """
    Create a simple STEP file using basic geometry.
    
    This is a PLACEHOLDER that creates a minimal STEP file.
    In production, this should be replaced with actual Onshape exports.
    """
    # ISO 10303-21 STEP file header
    step_content = f"""ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Fastener {fastener_id} - Generated from catalog dimensions'),'2;1');
FILE_NAME('/{fastener_id}.step','2026-09-20T00:00:00',('Fastener MCP'),('Onshape'),'Onshape FeatureScript','Onshape API','');
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#1=APPLICATION_CONTEXT('automotive design');
#2=APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,#1);
ENDSEC;
END-ISO-10303-21;
"""
    
    with open(output_path, 'w') as f:
        f.write(step_content)


def generate_sample_step_files(limit: int = 10):
    """
    Generate sample STEP files as placeholders.
    
    This creates minimal STEP files so the application can be tested.
    Replace with actual Onshape generation once FeatureScript integration is complete.
    """
    fasteners = load_fasteners_catalog()
    fasteners = [f for f in fasteners if f.get('length_mm', 0) > 0]
    
    if limit:
        fasteners = fasteners[:limit]
    
    output_dir = Path(__file__).parent.parent / "public" / "models"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating {len(fasteners)} sample STEP files (placeholders)...")
    print("NOTE: These are minimal STEP files for testing.")
    print("Replace with actual Onshape exports for production use.")
    print()
    
    for i, fastener in enumerate(fasteners, 1):
        fastener_id = fastener['id']
        diameter = fastener['diameter']
        length_mm = fastener['length_mm']
        
        output_path = output_dir / f"{fastener_id}.step"
        create_sample_step_file(fastener_id, diameter, length_mm, output_path)
        
        if i % 10 == 0:
            print(f"Generated {i}/{len(fasteners)}...")
    
    print(f"\n✓ Generated {len(fasteners)} sample STEP files")
    print(f"Location: {output_dir}")


def main():
    """Main entry point."""
    access_key = os.environ.get('ONSHAPE_ACCESS_KEY')
    secret_key = os.environ.get('ONSHAPE_SECRET_KEY')
    
    if not access_key or not secret_key:
        print("=" * 70)
        print("MISSING ONSHAPE API KEYS")
        print("=" * 70)
        print()
        print("Onshape API keys are required to generate STEP files using")
        print("Onshape's geometry engine.")
        print()
        print("To set up API keys:")
        print("1. Log in to Onshape")
        print("2. Go to your account settings")
        print("3. Navigate to API Keys section")
        print("4. Create a new API key pair")
        print("5. Set environment variables:")
        print()
        print("   export ONSHAPE_ACCESS_KEY='your_access_key'")
        print("   export ONSHAPE_SECRET_KEY='your_secret_key'")
        print()
        print("Then run this script again.")
        print()
        print("=" * 70)
        print()
        print("GENERATING SAMPLE STEP FILES (placeholders) for testing...")
        print()
        
        # Generate sample files so the app can be tested
        generate_sample_step_files(limit=20)
        return
    
    print("=" * 70)
    print("ONSHAPE STEP GENERATION")
    print("=" * 70)
    print()
    print("This script uses Onshape's REST API to generate BREP STEP files")
    print("from catalog dimensions using parametric Part Studio features.")
    print()
    print("⚠️  CURRENT STATUS: Template implementation")
    print()
    print("This demonstrates the authentication and API structure.")
    print("For production use, you need to:")
    print()
    print("1. Create Part Studio features via FeatureScript API")
    print("2. Define parametric geometry (cylinders, extrudes, threads)")
    print("3. Regenerate parts in Onshape")
    print("4. Export STEP files")
    print()
    print("See Onshape API docs: https://cad.onshape.com/glassworks/explorer")
    print()
    print("=" * 70)
    print()
    
    # For now, generate sample files
    print("Generating sample STEP files for testing...")
    generate_sample_step_files(limit=20)


if __name__ == '__main__':
    main()
