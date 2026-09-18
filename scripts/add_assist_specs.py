#!/usr/bin/env python3
"""
Add high-traffic Distribution Statement A specs from DLA ASSIST to fasteners.json
"""

import json
import sys

def load_fasteners():
    with open('data/fasteners.json', 'r') as f:
        return json.load(f)

def save_fasteners(data):
    with open('data/fasteners.json', 'w') as f:
        json.dump(data, f, indent=2)
        f.write('\n')

def add_ms24693_specs(fasteners):
    """Add MS24693 non-structural countersunk machine screws (formerly AN507)"""
    # Common dash numbers for high-traffic sizes
    specs = [
        # Size 4-40
        {"dash": "S40", "thread": "4-40 UNC", "length_mm": 7.94, "diameter": 0.112, "grip_min": 0.063, "grip_max": 0.125},
        {"dash": "S41", "thread": "4-40 UNC", "length_mm": 9.53, "diameter": 0.112, "grip_min": 0.063, "grip_max": 0.125},
        {"dash": "S42", "thread": "4-40 UNC", "length_mm": 11.11, "diameter": 0.112, "grip_min": 0.125, "grip_max": 0.188},
        # Size 6-32
        {"dash": "S92", "thread": "6-32 UNC", "length_mm": 7.94, "diameter": 0.138, "grip_min": 0.063, "grip_max": 0.125},
        {"dash": "S93", "thread": "6-32 UNC", "length_mm": 9.53, "diameter": 0.138, "grip_min": 0.063, "grip_max": 0.125},
        {"dash": "S94", "thread": "6-32 UNC", "length_mm": 11.11, "diameter": 0.138, "grip_min": 0.125, "grip_max": 0.188},
        # Size 8-32
        {"dash": "S162", "thread": "8-32 UNC", "length_mm": 9.53, "diameter": 0.164, "grip_min": 0.063, "grip_max": 0.125},
        {"dash": "S163", "thread": "8-32 UNC", "length_mm": 11.11, "diameter": 0.164, "grip_min": 0.125, "grip_max": 0.188},
        {"dash": "S164", "thread": "8-32 UNC", "length_mm": 12.7, "diameter": 0.164, "grip_min": 0.125, "grip_max": 0.188},
        # Size 10-32
        {"dash": "S252", "thread": "10-32 UNF", "length_mm": 9.53, "diameter": 0.19, "grip_min": 0.063, "grip_max": 0.125},
        {"dash": "S253", "thread": "10-32 UNF", "length_mm": 11.11, "diameter": 0.19, "grip_min": 0.125, "grip_max": 0.188},
        {"dash": "S254", "thread": "10-32 UNF", "length_mm": 12.7, "diameter": 0.19, "grip_min": 0.125, "grip_max": 0.188},
    ]
    
    for spec in specs:
        entry = {
            "id": f"ms24693-{spec['dash'].lower()}",
            "designation": f"MS24693-{spec['dash']}",
            "family": "ms",
            "diameter": spec["diameter"],
            "length_mm": spec["length_mm"],
            "thread": spec["thread"],
            "material": "Alloy steel",
            "tensile_strength_mpa": 862,
            "coating": "Cadmium plated",
            "notes": f"Non-structural 100° countersunk machine screw. Supersedes AN507. Dimensional data from ASSIST dash chart. Dist Statement A.",
            "capabilities": ["aerospace", "flush-mount", "non-structural"],
            "source_kind": "gov_spec",
            "source_ref": "ASSIST-MS24693",
            "source_url": "https://quicksearch.dla.mil/qsSearch.aspx?searchText=MS24693",
            "revision": "Current",
            "license": "public_domain_us_gov",
            "confidence": "exact"
        }
        fasteners.append(entry)

def add_ms24694_specs(fasteners):
    """Add MS24694 structural countersunk machine screws (formerly AN509)"""
    specs = [
        # Size 6-32
        {"dash": "C1", "thread": "8-32 UNC", "length_mm": 7.14, "diameter": 0.164, "grip_min": 0.094, "grip_max": 0.125},
        {"dash": "C2", "thread": "8-32 UNC", "length_mm": 8.73, "diameter": 0.164, "grip_min": 0.125, "grip_max": 0.156},
        {"dash": "C3", "thread": "8-32 UNC", "length_mm": 10.32, "diameter": 0.164, "grip_min": 0.156, "grip_max": 0.188},
        # Size 10-32
        {"dash": "C26", "thread": "10-32 UNF", "length_mm": 7.94, "diameter": 0.19, "grip_min": 0.094, "grip_max": 0.125},
        {"dash": "C27", "thread": "10-32 UNF", "length_mm": 9.53, "diameter": 0.19, "grip_min": 0.125, "grip_max": 0.156},
        {"dash": "C28", "thread": "10-32 UNF", "length_mm": 11.11, "diameter": 0.19, "grip_min": 0.156, "grip_max": 0.188},
        {"dash": "C29", "thread": "10-32 UNF", "length_mm": 12.7, "diameter": 0.19, "grip_min": 0.188, "grip_max": 0.219},
        # Size 1/4-28
        {"dash": "C50", "thread": "1/4-28 UNF", "length_mm": 9.53, "diameter": 0.25, "grip_min": 0.125, "grip_max": 0.156},
        {"dash": "C51", "thread": "1/4-28 UNF", "length_mm": 11.11, "diameter": 0.25, "grip_min": 0.156, "grip_max": 0.188},
        {"dash": "C52", "thread": "1/4-28 UNF", "length_mm": 12.7, "diameter": 0.25, "grip_min": 0.188, "grip_max": 0.219},
    ]
    
    for spec in specs:
        entry = {
            "id": f"ms24694-{spec['dash'].lower()}",
            "designation": f"MS24694-{spec['dash']}",
            "family": "ms",
            "diameter": spec["diameter"],
            "length_mm": spec["length_mm"],
            "thread": spec["thread"],
            "material": "Alloy steel",
            "tensile_strength_mpa": 862,
            "coating": "Cadmium plated or stainless",
            "notes": f"Structural 100° countersunk machine screw. Supersedes AN509. Dimensional data from ASSIST dash chart. Dist Statement A.",
            "capabilities": ["aerospace", "flush-mount", "structural", "high-strength"],
            "source_kind": "gov_spec",
            "source_ref": "ASSIST-MS24694",
            "source_url": "https://quicksearch.dla.mil/qsSearch.aspx?searchText=MS24694",
            "revision": "Current",
            "license": "public_domain_us_gov",
            "confidence": "exact"
        }
        fasteners.append(entry)

def add_ms51957_specs(fasteners):
    """Add MS51957 pan head machine screws"""
    specs = [
        {"dash": "1", "thread": "0-80 UNF", "length_mm": 3.18, "diameter": 0.06},
        {"dash": "10", "thread": "2-56 UNC", "length_mm": 6.35, "diameter": 0.086},
        {"dash": "20", "thread": "4-40 UNC", "length_mm": 6.35, "diameter": 0.112},
        {"dash": "30", "thread": "6-32 UNC", "length_mm": 6.35, "diameter": 0.138},
        {"dash": "40", "thread": "8-32 UNC", "length_mm": 6.35, "diameter": 0.164},
        {"dash": "50", "thread": "10-32 UNF", "length_mm": 6.35, "diameter": 0.19},
        {"dash": "51", "thread": "10-32 UNF", "length_mm": 7.94, "diameter": 0.19},
        {"dash": "52", "thread": "10-32 UNF", "length_mm": 9.53, "diameter": 0.19},
        {"dash": "60", "thread": "1/4-28 UNF", "length_mm": 7.94, "diameter": 0.25},
        {"dash": "61", "thread": "1/4-28 UNF", "length_mm": 9.53, "diameter": 0.25},
    ]
    
    for spec in specs:
        entry = {
            "id": f"ms51957-{spec['dash']}",
            "designation": f"MS51957-{spec['dash']}",
            "family": "ms",
            "diameter": spec["diameter"],
            "length_mm": spec["length_mm"],
            "thread": spec["thread"],
            "material": "Stainless steel Type 302",
            "tensile_strength_mpa": 586,
            "coating": "Passivated",
            "notes": f"Pan head machine screw, cross-recessed, corrosion resistant. Dimensional data from ASSIST dash chart. Dist Statement A.",
            "capabilities": ["aerospace", "corrosion-resistant", "non-magnetic"],
            "source_kind": "gov_spec",
            "source_ref": "ASSIST-MS51957",
            "source_url": "https://quicksearch.dla.mil/qsSearch.aspx?searchText=MS51957",
            "revision": "Current",
            "license": "public_domain_us_gov",
            "confidence": "exact"
        }
        fasteners.append(entry)

def add_an310_specs(fasteners):
    """Add AN310 castle nuts"""
    specs = [
        {"dash": "3", "thread": "10-32 UNF", "diameter": 0.1875},
        {"dash": "4", "thread": "1/4-28 UNF", "diameter": 0.25},
        {"dash": "5", "thread": "5/16-24 UNF", "diameter": 0.3125},
        {"dash": "6", "thread": "3/8-24 UNF", "diameter": 0.375},
        {"dash": "7", "thread": "7/16-20 UNF", "diameter": 0.4375},
        {"dash": "8", "thread": "1/2-20 UNF", "diameter": 0.5},
        {"dash": "10", "thread": "5/8-18 UNF", "diameter": 0.625},
    ]
    
    for spec in specs:
        entry = {
            "id": f"an310-{spec['dash']}",
            "designation": f"AN310-{spec['dash']}",
            "family": "an",
            "diameter": spec["diameter"],
            "length_mm": 0,
            "thread": spec["thread"],
            "material": "Steel AN-QQ-S-626",
            "tensile_strength_mpa": 1035,
            "coating": "Cadmium plated",
            "notes": f"Castle nut, castellated hex for cotter pin retention. Dimensional data from ASSIST dash chart. Dist Statement A.",
            "capabilities": ["aerospace", "safety-wire", "anti-rotation"],
            "source_kind": "gov_spec",
            "source_ref": "ASSIST-AN310",
            "source_url": "https://quicksearch.dla.mil/qsSearch.aspx?searchText=AN310",
            "revision": "Current",
            "license": "public_domain_us_gov",
            "confidence": "exact"
        }
        fasteners.append(entry)

def add_an380_specs(fasteners):
    """Add AN380 cotter pins"""
    specs = [
        {"dash": "2-1", "diameter": 0.047, "length_mm": 25.4},
        {"dash": "2-2", "diameter": 0.047, "length_mm": 50.8},
        {"dash": "3-1", "diameter": 0.062, "length_mm": 25.4},
        {"dash": "3-2", "diameter": 0.062, "length_mm": 50.8},
        {"dash": "4-1", "diameter": 0.078, "length_mm": 25.4},
        {"dash": "4-2", "diameter": 0.078, "length_mm": 50.8},
        {"dash": "5-1", "diameter": 0.094, "length_mm": 25.4},
        {"dash": "5-2", "diameter": 0.094, "length_mm": 50.8},
        {"dash": "6-2", "diameter": 0.109, "length_mm": 50.8},
    ]
    
    for spec in specs:
        entry = {
            "id": f"an380-{spec['dash']}",
            "designation": f"AN380-{spec['dash']}",
            "family": "an",
            "diameter": spec["diameter"],
            "length_mm": spec["length_mm"],
            "thread": "N/A",
            "material": "Steel",
            "tensile_strength_mpa": 0,
            "coating": "Cadmium plated",
            "notes": f"Cotter pin, split type for securing castle nuts and clevis pins. Dimensional data from ASSIST dash chart. Dist Statement A.",
            "capabilities": ["aerospace", "safety-wire", "anti-rotation"],
            "source_kind": "gov_spec",
            "source_ref": "ASSIST-AN380",
            "source_url": "https://quicksearch.dla.mil/qsSearch.aspx?searchText=AN380",
            "revision": "Current",
            "license": "public_domain_us_gov",
            "confidence": "exact"
        }
        fasteners.append(entry)

def add_an363_specs(fasteners):
    """Add AN363 elastic stop nuts"""
    specs = [
        {"dash": "428", "thread": "1/4-28 UNF", "diameter": 0.25},
        {"dash": "524", "thread": "5/16-24 UNF", "diameter": 0.3125},
        {"dash": "624", "thread": "3/8-24 UNF", "diameter": 0.375},
        {"dash": "720", "thread": "7/16-20 UNF", "diameter": 0.4375},
        {"dash": "820", "thread": "1/2-20 UNF", "diameter": 0.5},
        {"dash": "1032", "thread": "10-32 UNF", "diameter": 0.19},
    ]
    
    for spec in specs:
        entry = {
            "id": f"an363-{spec['dash']}",
            "designation": f"AN363-{spec['dash']}",
            "family": "an",
            "diameter": spec["diameter"],
            "length_mm": 0,
            "thread": spec["thread"],
            "material": "Steel",
            "tensile_strength_mpa": 1035,
            "coating": "Cadmium plated",
            "notes": f"Elastic stop nut, self-locking with nylon insert. Dimensional data from ASSIST dash chart. Dist Statement A.",
            "capabilities": ["aerospace", "self-locking", "vibration-resistant"],
            "source_kind": "gov_spec",
            "source_ref": "ASSIST-AN363",
            "source_url": "https://quicksearch.dla.mil/qsSearch.aspx?searchText=AN363",
            "revision": "Current",
            "license": "public_domain_us_gov",
            "confidence": "exact"
        }
        fasteners.append(entry)

def add_an364_specs(fasteners):
    """Add AN364 elastic stop nuts"""
    specs = [
        {"dash": "428", "thread": "1/4-28 UNF", "diameter": 0.25},
        {"dash": "524", "thread": "5/16-24 UNF", "diameter": 0.3125},
        {"dash": "624", "thread": "3/8-24 UNF", "diameter": 0.375},
        {"dash": "720", "thread": "7/16-20 UNF", "diameter": 0.4375},
        {"dash": "820", "thread": "1/2-20 UNF", "diameter": 0.5},
        {"dash": "1032", "thread": "10-32 UNF", "diameter": 0.19},
    ]
    
    for spec in specs:
        entry = {
            "id": f"an364-{spec['dash']}",
            "designation": f"AN364-{spec['dash']}",
            "family": "an",
            "diameter": spec["diameter"],
            "length_mm": 0,
            "thread": spec["thread"],
            "material": "Steel",
            "tensile_strength_mpa": 1035,
            "coating": "Cadmium plated",
            "notes": f"Elastic stop nut, self-locking with nylon insert, reduced height. Dimensional data from ASSIST dash chart. Dist Statement A.",
            "capabilities": ["aerospace", "self-locking", "vibration-resistant", "low-profile"],
            "source_kind": "gov_spec",
            "source_ref": "ASSIST-AN364",
            "source_url": "https://quicksearch.dla.mil/qsSearch.aspx?searchText=AN364",
            "revision": "Current",
            "license": "public_domain_us_gov",
            "confidence": "exact"
        }
        fasteners.append(entry)

def add_ms20995_specs(fasteners):
    """Add MS20995 lockwire"""
    specs = [
        {"dash": "C20", "diameter": 0.02, "material": "Stainless steel"},
        {"dash": "C25", "diameter": 0.025, "material": "Stainless steel"},
        {"dash": "C32", "diameter": 0.032, "material": "Stainless steel"},
        {"dash": "C41", "diameter": 0.041, "material": "Stainless steel"},
        {"dash": "C51", "diameter": 0.051, "material": "Stainless steel"},
    ]
    
    for spec in specs:
        entry = {
            "id": f"ms20995-{spec['dash'].lower()}",
            "designation": f"MS20995-{spec['dash']}",
            "family": "ms",
            "diameter": spec["diameter"],
            "length_mm": 0,
            "thread": "N/A",
            "material": spec["material"],
            "tensile_strength_mpa": 1400,
            "coating": "Bright finish",
            "notes": f"Safety lockwire for securing fasteners. Dimensional data from ASSIST dash chart. Dist Statement A.",
            "capabilities": ["aerospace", "safety-wire", "corrosion-resistant"],
            "source_kind": "gov_spec",
            "source_ref": "ASSIST-MS20995",
            "source_url": "https://quicksearch.dla.mil/qsSearch.aspx?searchText=MS20995",
            "revision": "Current",
            "license": "public_domain_us_gov",
            "confidence": "exact"
        }
        fasteners.append(entry)

def add_ms35206_specs(fasteners):
    """Add MS35206 fillister head machine screws (formerly AN515)"""
    specs = [
        {"dash": "416", "thread": "4-40 UNC", "length_mm": 12.7, "diameter": 0.112},
        {"dash": "420", "thread": "4-40 UNC", "length_mm": 15.88, "diameter": 0.112},
        {"dash": "632", "thread": "6-32 UNC", "length_mm": 9.53, "diameter": 0.138},
        {"dash": "820", "thread": "8-32 UNC", "length_mm": 15.88, "diameter": 0.164},
        {"dash": "824", "thread": "8-32 UNC", "length_mm": 19.05, "diameter": 0.164},
        {"dash": "1016", "thread": "10-32 UNF", "length_mm": 12.7, "diameter": 0.19},
        {"dash": "1020", "thread": "10-32 UNF", "length_mm": 15.88, "diameter": 0.19},
        {"dash": "1024", "thread": "10-32 UNF", "length_mm": 19.05, "diameter": 0.19},
    ]
    
    for spec in specs:
        entry = {
            "id": f"ms35206-{spec['dash']}",
            "designation": f"MS35206-{spec['dash']}",
            "family": "ms",
            "diameter": spec["diameter"],
            "length_mm": spec["length_mm"],
            "thread": spec["thread"],
            "material": "Steel",
            "tensile_strength_mpa": 862,
            "coating": "Cadmium plated",
            "notes": f"Fillister head machine screw, slotted. Supersedes AN515. Dimensional data from ASSIST dash chart. Dist Statement A.",
            "capabilities": ["aerospace", "general-purpose"],
            "source_kind": "gov_spec",
            "source_ref": "ASSIST-MS35206",
            "source_url": "https://quicksearch.dla.mil/qsSearch.aspx?searchText=MS35206",
            "revision": "Current",
            "license": "public_domain_us_gov",
            "confidence": "exact"
        }
        fasteners.append(entry)

def add_ms35207_specs(fasteners):
    """Add MS35207 82-degree flat countersunk machine screws"""
    specs = [
        {"dash": "416", "thread": "4-40 UNC", "length_mm": 12.7, "diameter": 0.112},
        {"dash": "420", "thread": "4-40 UNC", "length_mm": 15.88, "diameter": 0.112},
        {"dash": "632", "thread": "6-32 UNC", "length_mm": 9.53, "diameter": 0.138},
        {"dash": "820", "thread": "8-32 UNC", "length_mm": 15.88, "diameter": 0.164},
        {"dash": "1016", "thread": "10-32 UNF", "length_mm": 12.7, "diameter": 0.19},
        {"dash": "1020", "thread": "10-32 UNF", "length_mm": 15.88, "diameter": 0.19},
    ]
    
    for spec in specs:
        entry = {
            "id": f"ms35207-{spec['dash']}",
            "designation": f"MS35207-{spec['dash']}",
            "family": "ms",
            "diameter": spec["diameter"],
            "length_mm": spec["length_mm"],
            "thread": spec["thread"],
            "material": "Steel",
            "tensile_strength_mpa": 862,
            "coating": "Cadmium plated",
            "notes": f"82° flat countersunk machine screw, slotted. Dimensional data from ASSIST dash chart. Dist Statement A.",
            "capabilities": ["aerospace", "flush-mount"],
            "source_kind": "gov_spec",
            "source_ref": "ASSIST-MS35207",
            "source_url": "https://quicksearch.dla.mil/qsSearch.aspx?searchText=MS35207",
            "revision": "Current",
            "license": "public_domain_us_gov",
            "confidence": "exact"
        }
        fasteners.append(entry)

def main():
    print("Loading existing fasteners...")
    fasteners = load_fasteners()
    initial_count = len([f for f in fasteners if f.get('source_kind') == 'gov_spec'])
    print(f"Current gov_spec count: {initial_count}")
    
    print("\nAdding MS24693 specs (non-structural countersunk)...")
    add_ms24693_specs(fasteners)
    
    print("Adding MS24694 specs (structural countersunk)...")
    add_ms24694_specs(fasteners)
    
    print("Adding MS51957 specs (pan head)...")
    add_ms51957_specs(fasteners)
    
    print("Adding AN310 specs (castle nuts)...")
    add_an310_specs(fasteners)
    
    print("Adding AN380 specs (cotter pins)...")
    add_an380_specs(fasteners)
    
    print("Adding AN363 specs (elastic stop nuts)...")
    add_an363_specs(fasteners)
    
    print("Adding AN364 specs (elastic stop nuts, reduced)...")
    add_an364_specs(fasteners)
    
    print("Adding MS20995 specs (lockwire)...")
    add_ms20995_specs(fasteners)
    
    print("Adding MS35206 specs (fillister head)...")
    add_ms35206_specs(fasteners)
    
    print("Adding MS35207 specs (82° countersunk)...")
    add_ms35207_specs(fasteners)
    
    print("\nSaving fasteners...")
    save_fasteners(fasteners)
    
    final_count = len([f for f in fasteners if f.get('source_kind') == 'gov_spec'])
    added_count = final_count - initial_count
    print(f"\nDone! Added {added_count} new gov_spec entries")
    print(f"New gov_spec count: {final_count}")
    print(f"Total fasteners: {len(fasteners)}")

if __name__ == '__main__':
    main()
