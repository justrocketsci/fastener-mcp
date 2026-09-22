"""A16: cache inputs invalidate generated work without modifying published bytes."""
import copy
import importlib.util
import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("geometry_build", ROOT / "scripts/geometry/build.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class GeometryCacheTests(unittest.TestCase):
    def test_recipe_parameters_source_toolchain_and_revision_invalidate(self):
        part = next(p for p in json.loads((ROOT / "data/catalog/parts.json").read_text())["items"] if p["id"] == "iso4762-m6x20-a2")
        old = next(g for g in json.loads((ROOT / "data/geometry/manifest.json").read_text())["items"] if g["id"] == part["geometry_ids"][0])
        asset = ROOT / "public" / old["asset_path"].lstrip("/")
        before = build.sha(asset)
        base = build.build_key(part, "simplified")
        self.assertEqual(base, build.build_key(part, "simplified"))
        self.assertNotEqual(base, build.build_key(part, "simplified", recipe_version="next"))
        self.assertNotEqual(base, build.build_key(part, "simplified", source_hash="different source"))
        self.assertNotEqual(base, build.build_key(part, "simplified", toolchain={"ocp": "next"}))
        self.assertNotEqual(base, build.build_key(part, "detailed"))
        changed = copy.deepcopy(part)
        changed["revision"] += 1
        self.assertNotEqual(base, build.build_key(changed, "simplified"))
        changed["dimensions"]["length"]["value"] = 21
        changed["dimensions"]["length"]["normalized_mm"] = 21
        self.assertNotEqual(base[0], build.build_key(changed, "simplified")[0])
        self.assertEqual(before, old["sha256"])
        self.assertEqual(build.sha(asset), before)


if __name__ == "__main__":
    unittest.main()
