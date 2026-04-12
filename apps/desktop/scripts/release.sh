#!/bin/bash
set -e

# Release script for nodl desktop app
# Usage: pnpm run release
#
# Flow:
#   1. Ask for version
#   2. Generate draft changelog section in CHANGELOG.draft.md
#   3. Wait for you to edit it in your IDE, then press Enter
#   4. Prepend to CHANGELOG.md, update AboutDialog.tsx, package.json, Header.tsx
#   5. Commit + lint + test
#   6. Build + package
#   7. Tag, push, create GitHub release

ABOUT_DIALOG="src/components/Header/AboutDialog.tsx"
HEADER="src/components/Header/Header.tsx"
CHANGELOG="CHANGELOG.md"
DRAFT="CHANGELOG.draft.md"

# --- Prompt for version ---
CURRENT=$(node -p "require('./package.json').version")
LAST_TAG=$(git tag -l 'v*' --sort=-v:refname | head -1)
echo "Current version: $CURRENT (last tag: ${LAST_TAG:-none})"
read -rp "New version (e.g. 1.1.0): " VERSION

if [[ -z "$VERSION" ]]; then
  echo "No version provided. Aborting."
  exit 1
fi

TAG="v$VERSION"
SHORT_VERSION=$(echo "$VERSION" | sed 's/\.[0-9]*$//')  # 1.1.0 -> 1.1
TODAY=$(date +%Y-%m-%d)

# --- Check for clean working tree ---
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty. Commit or stash changes first."
  exit 1
fi

# --- Check tag doesn't exist ---
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists. Aborting."
  exit 1
fi

# --- Generate draft changelog ---
{
  echo "## $TAG ($TODAY)"
  echo ""

  if [[ -n "$LAST_TAG" ]]; then
    git log "$LAST_TAG"..HEAD --pretty=format:'%s' --no-merges | while IFS= read -r line; do
      case "$line" in
        release:*|docs:*) continue ;;
      esac
      clean=$(echo "$line" | sed 's/^[a-z]*: //' | sed 's/^[a-z]*(//' | sed 's/): /: /')
      echo "- $clean"
    done
  else
    git log --pretty=format:'- %s' --no-merges -20
  fi

  echo ""
} > "$DRAFT"

echo ""
echo "Generated draft: $DRAFT"
echo ""
cat "$DRAFT"
echo "---"
echo "Edit $DRAFT in your IDE. Remove, reword, or reorder lines."
echo "Each '- ' line becomes a changelog entry."
echo ""
read -rp "Press Enter when done editing... "

# --- Parse changelog entries ---
CHANGES=()
while IFS= read -r line; do
  if [[ "$line" == "- "* ]]; then
    CHANGES+=("${line#- }")
  fi
done < "$DRAFT"

if [[ ${#CHANGES[@]} -eq 0 ]]; then
  rm -f "$DRAFT"
  echo "No changelog entries found (lines starting with '- '). Aborting."
  exit 1
fi

echo ""
echo "Will release $TAG with ${#CHANGES[@]} changes:"
for c in "${CHANGES[@]}"; do
  echo "  - $c"
done
echo ""
echo "This will:"
echo "  1. Prepend to CHANGELOG.md"
echo "  2. Update AboutDialog.tsx changelog"
echo "  3. Update package.json version to $VERSION"
echo "  4. Update Header.tsx version to v$SHORT_VERSION"
echo "  5. Commit as 'release: $TAG'"
echo "  6. Run lint + tests"
echo "  7. Build + package (DMG)"
echo "  8. Tag, push, create GitHub release"
echo ""
read -rp "Continue? (y/N) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  rm -f "$DRAFT"
  echo "Aborted."
  exit 1
fi

# --- Prepend to CHANGELOG.md ---
if [[ -f "$CHANGELOG" ]]; then
  # Prepend draft + blank line + existing content
  { cat "$DRAFT"; echo ""; cat "$CHANGELOG"; } > "$CHANGELOG.tmp"
  mv "$CHANGELOG.tmp" "$CHANGELOG"
else
  # First release — create with header
  { echo "# Changelog"; echo ""; cat "$DRAFT"; } > "$CHANGELOG"
fi
rm -f "$DRAFT"
echo "Updated CHANGELOG.md"

# --- Update AboutDialog.tsx changelog ---
node -e "
  const fs = require('fs');
  let src = fs.readFileSync('$ABOUT_DIALOG', 'utf8');
  const changes = JSON.parse(process.argv[1]);
  const indent = '    ';
  const items = changes.map(c => indent + \"  '\" + c.replace(/'/g, \"\\\\'\") + \"',\").join('\n');
  const entry = indent + '{\n' +
    indent + \"  version: '$VERSION',\n\" +
    indent + \"  date: '$TODAY',\n\" +
    indent + '  changes: [\n' +
    items + '\n' +
    indent + '  ],\n' +
    indent + '},';
  src = src.replace('const CHANGELOG = [', 'const CHANGELOG = [\n' + entry);
  fs.writeFileSync('$ABOUT_DIALOG', src);
" "$(printf '%s\n' "${CHANGES[@]}" | node -e "
  const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\n');
  process.stdout.write(JSON.stringify(lines));
")"
echo "Updated AboutDialog.tsx changelog"

# --- Update package.json version ---
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo "Updated package.json to $VERSION"

# --- Update Header.tsx version ---
sed -i '' "s/v[0-9]*\.[0-9]*/v$SHORT_VERSION/" "$HEADER"
echo "Updated Header.tsx to v$SHORT_VERSION"

# --- Commit release changes ---
git add package.json "$HEADER" "$ABOUT_DIALOG" "$CHANGELOG"
git commit -m "release: $TAG"
echo "Committed release changes"

# --- Lint + test ---
echo ""
echo "Running lint..."
pnpm run lint

echo "Running tests..."
pnpm run test

# --- Build + package ---
echo ""
echo "Building and packaging..."
pnpm run dist

# --- Tag + push ---
git tag "$TAG"
git push
git push origin "$TAG"
echo "Pushed commit and tag $TAG"

# --- Create GitHub release ---
NOTES=$(printf '%s\n' "${CHANGES[@]}" | sed 's/^/- /')
DMG=$(find dist -name "*.dmg" -type f 2>/dev/null | head -1)
if [[ -n "$DMG" ]]; then
  gh release create "$TAG" "$DMG" --title "$TAG" --notes "$NOTES"
  echo "Created GitHub release $TAG with $DMG"
else
  gh release create "$TAG" --title "$TAG" --notes "$NOTES"
  echo "Created GitHub release $TAG (no DMG found to attach)"
fi

echo ""
echo "Released $TAG"
