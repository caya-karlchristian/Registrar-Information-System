#!/usr/bin/env python3
"""
patch_request_form.py
---------------------
Wires purposeOfRequest properly in registrar-frontend/src/layouts/RequestForm.jsx.

Changes applied:
  1. Add `availablePurposes` state alongside the existing state declarations.
  2. Fetch /request-purposes inside the loadOptions useEffect (with fallback).
  3. Replace the fragile PURPOSE_MAP reverse-lookup in handleSubmit with a
     direct lookup against the fetched purpose objects.
  4. Replace the hardcoded `purposeOptions` with API-driven data (PURPOSE_MAP
     used only as fallback, matching the pattern already used for docs/certs).

Usage:
    python3 patch_request_form.py <path/to/RequestForm.jsx>

    # Example (file extracted from registrar-frontend.zip):
    python3 patch_request_form.py registrar-frontend/src/layouts/RequestForm.jsx

The script creates a .bak backup before modifying the file.
"""

import sys
import shutil
from pathlib import Path


# ---------------------------------------------------------------------------
# Patch definitions — (old_text, new_text, description)
# Each old_text must appear exactly once in the file.
# ---------------------------------------------------------------------------

PATCHES = [
    # ------------------------------------------------------------------
    # 1. Add availablePurposes state next to availableCertifications state
    # ------------------------------------------------------------------
    (
        "  const [availableCertifications, setAvailableCertifications] = useState([]);",

        "  const [availableCertifications, setAvailableCertifications] = useState([]);\n"
        "  const [availablePurposes, setAvailablePurposes] = useState([]);",

        "Add availablePurposes state",
    ),

    # ------------------------------------------------------------------
    # 2. Fetch /request-purposes inside loadOptions (after the cert block)
    # ------------------------------------------------------------------
    (
        "      try {\n"
        "        const certRes = await axios.get(\"/certifications\");\n"
        "        setAvailableCertifications((certRes.data ?? []).filter(cert => STUDENT_ACCESS_IDS.includes(cert.access_id)));\n"
        "      } catch (err) {\n"
        "        console.warn(\"Certification types API unavailable, using constants.\");\n"
        "      }\n"
        "    };\n"
        "    loadOptions();",

        "      try {\n"
        "        const certRes = await axios.get(\"/certifications\");\n"
        "        setAvailableCertifications((certRes.data ?? []).filter(cert => STUDENT_ACCESS_IDS.includes(cert.access_id)));\n"
        "      } catch (err) {\n"
        "        console.warn(\"Certification types API unavailable, using constants.\");\n"
        "      }\n"
        "\n"
        "      try {\n"
        "        const purposeRes = await axios.get(\"/request-purposes\");\n"
        "        setAvailablePurposes(purposeRes.data ?? []);\n"
        "      } catch (err) {\n"
        "        console.warn(\"Request purposes API unavailable, using constants.\");\n"
        "      }\n"
        "    };\n"
        "    loadOptions();",

        "Add /request-purposes fetch inside loadOptions",
    ),

    # ------------------------------------------------------------------
    # 3. Replace fragile PURPOSE_MAP reverse-lookup with direct API lookup
    # ------------------------------------------------------------------
    (
        "    const purposeId = Object.keys(PURPOSE_MAP).find(\n"
        "      key => PURPOSE_MAP[key] === formData.purposeOfRequest\n"
        "    );",

        "    const selectedPurpose = availablePurposes.find(\n"
        "      p => p.purpose_name === formData.purposeOfRequest\n"
        "    );\n"
        "    const purposeId = selectedPurpose?.request_purpose_id\n"
        "      ?? Object.keys(PURPOSE_MAP).find(key => PURPOSE_MAP[key] === formData.purposeOfRequest);",

        "Replace PURPOSE_MAP reverse-lookup with API-driven purpose ID resolution",
    ),

    # ------------------------------------------------------------------
    # 4. Replace hardcoded purposeOptions with API-driven options + fallback
    # ------------------------------------------------------------------
    (
        "  const purposeOptions = Object.values(PURPOSE_MAP);",

        "  const purposeOptions = availablePurposes.length > 0\n"
        "    ? availablePurposes.map(p => p.purpose_name)\n"
        "    : Object.values(PURPOSE_MAP);",

        "Replace hardcoded purposeOptions with API-driven data (PURPOSE_MAP as fallback)",
    ),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def apply_patches(source: str, patches: list) -> tuple[str, list[str]]:
    """Apply all patches in order. Returns (patched_source, list_of_errors)."""
    errors = []
    result = source
    for old, new, description in patches:
        count = result.count(old)
        if count == 0:
            errors.append(f"  [FAIL] '{description}' — target text not found in file.")
        elif count > 1:
            errors.append(f"  [FAIL] '{description}' — target text found {count} times (must be unique).")
        else:
            result = result.replace(old, new, 1)
            print(f"  [OK]   {description}")
    return result, errors


def main():
    if len(sys.argv) != 2:
        print(f"Usage: python3 {sys.argv[0]} <path/to/RequestForm.jsx>")
        sys.exit(1)

    target = Path(sys.argv[1])
    if not target.exists():
        print(f"Error: file not found: {target}")
        sys.exit(1)

    # Backup
    backup = target.with_suffix(".jsx.bak")
    shutil.copy2(target, backup)
    print(f"Backup written to: {backup}")

    source = target.read_text(encoding="utf-8")

    print("\nApplying patches...")
    patched, errors = apply_patches(source, PATCHES)

    if errors:
        print("\nThe following patches FAILED:")
        for e in errors:
            print(e)
        print("\nNo changes were written. Check that the file matches the expected version.")
        sys.exit(1)

    target.write_text(patched, encoding="utf-8")
    print(f"\nAll {len(PATCHES)} patches applied successfully.")
    print(f"Updated file: {target}")


if __name__ == "__main__":
    main()
