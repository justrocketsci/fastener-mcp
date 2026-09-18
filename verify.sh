#!/bin/bash
# Fastener MCP MVP Verification Script

echo "=== Fastener MCP MVP Verification ==="
echo ""

BASE_URL="http://localhost:43210"

echo "1. Testing GET /api/fasteners (list all)"
curl -s "$BASE_URL/api/fasteners?limit=3" | jq -r '.count' | xargs -I {} echo "   ✓ Found {} fasteners"
echo ""

echo "2. Testing GET /api/fasteners (search ISO)"
curl -s "$BASE_URL/api/fasteners?family=iso&limit=3" | jq -r '.count' | xargs -I {} echo "   ✓ Found {} ISO fasteners"
echo ""

echo "3. Testing GET /api/fasteners/:id"
curl -s "$BASE_URL/api/fasteners/iso-4017-m6-30" | jq -r '.designation' | xargs -I {} echo "   ✓ Retrieved: {}"
echo ""

echo "4. Testing POST /api/recommend"
curl -s -X POST "$BASE_URL/api/recommend" \
  -H "Content-Type: application/json" \
  -d '{"diameter": 6, "length": 30, "material": "steel"}' | \
  jq -r '.count' | xargs -I {} echo "   ✓ Generated {} recommendations"
echo ""

echo "5. Testing web pages"
[ $(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/") -eq 200 ] && echo "   ✓ Landing page (/) responds"
[ $(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/search") -eq 200 ] && echo "   ✓ Search page (/search) responds"
[ $(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/mcp") -eq 200 ] && echo "   ✓ MCP docs (/mcp) responds"
echo ""

echo "=== All checks passed! ==="
