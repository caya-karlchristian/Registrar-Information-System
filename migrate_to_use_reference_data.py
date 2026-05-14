#!/usr/bin/env python3
"""
migrate_to_use_reference_data.py
=================================
Migrates all six consumer components off the deprecated map shims
(DOC_TYPE_MAP, PURPOSE_MAP, CERTIFICATION_MAP) and onto useReferenceData().

What it does per file
---------------------
1. Removes DOC_TYPE_MAP / PURPOSE_MAP / CERTIFICATION_MAP from the
   'constants' import (drops the whole import line if it becomes empty).
2. Adds `import { useReferenceData } from '../context/ReferenceDataContext';`
   (or the correct relative path) if not already present.
3. Inserts the hook call inside the component function body:
       const { docTypeName, purposeName, certName } = useReferenceData();
4. Replaces every usage:
       DOC_TYPE_MAP[x]      → docTypeName(x)
       PURPOSE_MAP[x]       → purposeName(x)
       CERTIFICATION_MAP[x] → certName(x)

Usage
-----
    # Dry run (shows what would change, writes nothing):
    python3 migrate_to_use_reference_data.py --dry-run

    # Live run:
    python3 migrate_to_use_reference_data.py

    # Custom repo root:
    python3 migrate_to_use_reference_data.py --repo-root /path/to/repo
"""

import argparse
import re
import shutil
import sys
from pathlib import Path

# ── Colour helpers ─────────────────────────────────────────────────────────────
def green(s):  return f"\033[32m{s}\033[0m"
def yellow(s): return f"\033[33m{s}\033[0m"
def red(s):    return f"\033[31m{s}\033[0m"
def bold(s):   return f"\033[1m{s}\033[0m"
def dim(s):    return f"\033[2m{s}\033[0m"
def cyan(s):   return f"\033[36m{s}\033[0m"

def ok(msg):   print(f"  {green('✔')}  {msg}")
def warn(msg): print(f"  {yellow('⚠')}  {msg}")
def fail(msg): print(f"  {red('✘')}  {msg}")
def info(msg): print(f"  {dim('·')}  {msg}")
def step(msg): print(f"  {cyan('→')}  {msg}")

# ── Target components ──────────────────────────────────────────────────────────
# (repo-relative path, depth from src/ so we can compute the relative import)
TARGETS = [
    "registrar-frontend/src/layouts/RequestForm.jsx",
    "registrar-frontend/src/components/RequestDetailModal.jsx",
    "registrar-frontend/src/layouts/StudentDashboard.jsx",
    "registrar-frontend/src/layouts/StaffDashboard.jsx",
    "registrar-frontend/src/layouts/AlumniRequest.jsx",
    "registrar-frontend/src/layouts/Logbook.jsx",
]

# ── Regex patterns ─────────────────────────────────────────────────────────────
# Match any import that pulls from utils/constants (handles single or double quotes)
CONSTANTS_IMPORT_RE = re.compile(
    r"^import\s*\{([^}]+)\}\s*from\s*['\"](?:\.\./)*utils/constants['\"];?\s*$",
    re.MULTILINE,
)

# The three deprecated names we want to strip
DEPRECATED_NAMES = {"DOC_TYPE_MAP", "PURPOSE_MAP", "CERTIFICATION_MAP"}

# Map usage: DOC_TYPE_MAP[expr] → docTypeName(expr)
# Handles bracket access with identifiers, member expressions, or string/number literals
MAP_USAGE_RE = re.compile(
    r"\b(DOC_TYPE_MAP|PURPOSE_MAP|CERTIFICATION_MAP)\[([^\]]+)\]"
)

MAP_REPLACEMENT = {
    "DOC_TYPE_MAP":      "docTypeName",
    "PURPOSE_MAP":       "purposeName",
    "CERTIFICATION_MAP": "certName",
}

# Hook destructure line we inject
HOOK_LINE = "  const { docTypeName, purposeName, certName } = useReferenceData();"

# Detects if hook is already imported
HOOK_IMPORT_RE = re.compile(r"useReferenceData")

# Detects if hook is already destructured
HOOK_CALL_RE = re.compile(r"useReferenceData\(\)")

# ── Path helpers ───────────────────────────────────────────────────────────────

def relative_import_path(file_path: Path) -> str:
    """
    Return the import path for ReferenceDataContext relative to file_path.
    e.g. layouts/Foo.jsx  → '../context/ReferenceDataContext'
         components/Bar.jsx → '../context/ReferenceDataContext'
    """
    # All six targets are one level below src/ (layouts/ or components/)
    # so the relative path is always ../context/ReferenceDataContext
    return "../context/ReferenceDataContext"


def hook_import_line(file_path: Path) -> str:
    rel = relative_import_path(file_path)
    return f"import {{ useReferenceData }} from '{rel}';"


# ── Per-file migration ─────────────────────────────────────────────────────────

def migrate_content(content: str, file_path: Path) -> tuple[str, list[str]]:
    """
    Return (new_content, list_of_change_descriptions).
    If no changes needed, new_content == content.
    """
    changes: list[str] = []
    lines = content.splitlines(keepends=True)

    # ── Step 1: strip deprecated names from constants import ─────────────────
    new_lines = []
    for line in lines:
        m = CONSTANTS_IMPORT_RE.match(line.rstrip("\n"))
        if m:
            names_raw = m.group(1)
            names = [n.strip() for n in names_raw.split(",") if n.strip()]
            kept = [n for n in names if n not in DEPRECATED_NAMES]
            removed = [n for n in names if n in DEPRECATED_NAMES]

            if not removed:
                new_lines.append(line)
                continue

            changes.append(f"Removed {', '.join(removed)} from constants import")

            if kept:
                # Rebuild import with remaining names
                new_import = f"import {{ {', '.join(kept)} }} from '../utils/constants';\n"
                new_lines.append(new_import)
            else:
                # Entire import becomes empty — drop the line
                changes.append("Dropped empty constants import line")
        else:
            new_lines.append(line)

    content = "".join(new_lines)

    # ── Step 2: add useReferenceData import (if not already present) ──────────
    if not HOOK_IMPORT_RE.search(content):
        hook_import = hook_import_line(file_path)
        # Insert after the last existing import block
        last_import_match = None
        for m in re.finditer(r"^import\s+.+;?\s*$", content, re.MULTILINE):
            last_import_match = m
        if last_import_match:
            insert_pos = last_import_match.end()
            content = content[:insert_pos] + "\n" + hook_import + content[insert_pos:]
        else:
            # No imports found — prepend
            content = hook_import + "\n" + content
        changes.append(f"Added useReferenceData import")

    # ── Step 3: inject hook call inside component function (if not present) ───
    if not HOOK_CALL_RE.search(content):
        # Heuristic: find the first function/arrow-function body opening brace
        # after "export default function" / "const Foo = (" / "function Foo("
        # We look for the pattern: ) { or => { on a line by itself or inline
        # and insert after it. Conservative approach: find first `{` that follows
        # a component-like declaration and appears on its own or after `=>` / `)`.

        # Pattern: opening brace of a React component body
        component_open_re = re.compile(
            r"((?:export\s+default\s+)?(?:function\s+\w+|const\s+\w+\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>)\s*\{)",
            re.MULTILINE,
        )
        m = component_open_re.search(content)
        if m:
            insert_pos = m.end()
            content = content[:insert_pos] + "\n" + HOOK_LINE + content[insert_pos:]
            changes.append("Injected useReferenceData() hook call inside component body")
        else:
            changes.append(
                "⚠ Could not auto-locate component body — add hook call manually: "
                + HOOK_LINE.strip()
            )

    # ── Step 4: replace all map bracket usages ────────────────────────────────
    def replace_map(m: re.Match) -> str:
        map_name = m.group(1)
        expr = m.group(2)
        fn = MAP_REPLACEMENT[map_name]
        return f"{fn}({expr})"

    new_content, count = MAP_USAGE_RE.subn(replace_map, content)
    if count:
        changes.append(f"Replaced {count} map bracket access(es) with hook function calls")
    content = new_content

    return content, changes


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Migrate components from deprecated map shims to useReferenceData()."
    )
    parser.add_argument(
        "--repo-root", default=".",
        help="Path to the repository root (default: current directory).",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview changes without writing anything.",
    )
    args = parser.parse_args()

    repo_root = Path(args.repo_root).resolve()
    dry_run   = args.dry_run

    print(f"\n{bold('migrate_to_use_reference_data.py')}")
    print(f"  Repo root : {repo_root}")
    print(f"  Mode      : {yellow('DRY RUN — nothing will be written') if dry_run else green('LIVE — files will be modified')}\n")

    if not repo_root.exists():
        fail(f"Repo root not found: {repo_root}")
        sys.exit(1)

    any_failure = False
    migrated = []
    skipped  = []

    for rel in TARGETS:
        path = repo_root / rel
        print(f"{bold(rel)}")

        if not path.exists():
            warn(f"File not found — skipping.")
            skipped.append(rel)
            print()
            continue

        original = path.read_text(encoding="utf-8")

        # Quick check: does this file even use any of the deprecated maps?
        uses_deprecated = any(name in original for name in DEPRECATED_NAMES)
        already_migrated = HOOK_CALL_RE.search(original) and not uses_deprecated

        if already_migrated:
            ok("Already migrated — nothing to do.")
            skipped.append(rel)
            print()
            continue

        new_content, changes = migrate_content(original, path)

        if not changes:
            ok("No changes needed.")
            skipped.append(rel)
            print()
            continue

        for change in changes:
            if change.startswith("⚠"):
                warn(change[2:].strip())
            else:
                step(change)

        if new_content == original:
            warn("Content unchanged after transforms (check manually).")
            skipped.append(rel)
            print()
            continue

        if not dry_run:
            # Back up original
            backup = path.with_suffix(path.suffix + ".bak_migrate_ref")
            shutil.copy2(path, backup)
            info(f"Backup → {backup.name}")

            path.write_text(new_content, encoding="utf-8")
            ok("File written.")
            migrated.append(rel)
        else:
            warn("DRY RUN — not written.")
            migrated.append(rel)  # count as "would migrate"

        print()

    # ── Summary ────────────────────────────────────────────────────────────────
    print(f"{bold('Summary')}")
    print(f"  {'Would migrate' if dry_run else 'Migrated'} : {green(str(len(migrated)))} file(s)")
    print(f"  Skipped   : {str(len(skipped))} file(s)")

    if any_failure:
        print(f"\n  {red('Some files failed — review warnings above.')}")

    if dry_run and migrated:
        print(f"\n  {yellow('Re-run without --dry-run to apply changes.')}")

    if not dry_run and migrated:
        print(f"\n{bold('Next steps')}")
        print(f"  {green('1.')} Run your build:  {cyan('docker compose up --build -d')}")
        print(f"  {green('2.')} Verify the app works end-to-end.")
        print(f"  {green('3.')} Remove the @deprecated-shims block from constants.js")
        print(f"       once you have confirmed all components are working.\n")


if __name__ == "__main__":
    main()
