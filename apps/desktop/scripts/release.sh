#!/bin/bash
set -e

# Release script for nodl desktop app
# Usage: pnpm run release
#
# Flow:
#   1. Lint + test + build first (catch errors before any release work)
#   2. Ask for version
#   3. Generate draft changelog in CHANGELOG.draft.md
#   4. Wait for you to edit it in your IDE, then press Enter
#   5. Prepend to CHANGELOG.md, update package.json, Header.tsx
#   6. Commit, tag, push, create GitHub release

CHANGELOG="CHANGELOG.md"
DRAFT="CHANGELOG.draft.md"

# --- Check for clean working tree ---
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is dirty. Commit or stash changes first."
  exit 1
fi

# --- Lint + test + build first ---
echo "Running lint..."
pnpm run lint

echo ""
echo "Running tests..."
pnpm run test

echo ""
echo "Building and packaging..."
pnpm run dist

echo ""
echo "=== Lint, tests, and build passed ==="
echo ""

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
TODAY=$(date +%Y-%m-%d)

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
    git log "$LAST_TAG"..HEAD --pretty=tformat:'%s' --no-merges | while IFS= read -r line || [[ -n "$line" ]]; do
      case "$line" in
        release:*|docs:*) continue ;;
      esac
      clean=$(echo "$line" | sed 's/^[a-z]*: //' | sed 's/^[a-z]*(//' | sed 's/): /: /')
      echo "- $clean"
    done
  else
    git log --pretty=tformat:'- %s' --no-merges -20
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
while IFS= read -r line || [[ -n "$line" ]]; do
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
echo "  1. Insert into CHANGELOG.md"
echo "  2. Update package.json version to $VERSION"
echo "  3. Commit, tag, push"
echo "  4. Create GitHub release with DMG"
echo ""
read -rp "Continue? (y/N) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  rm -f "$DRAFT"
  echo "Aborted."
  exit 1
fi

# --- Insert into CHANGELOG.md after the title line ---
if [[ -f "$CHANGELOG" ]]; then
  node -e "
    const fs = require('fs');
    const changelog = fs.readFileSync('$CHANGELOG', 'utf8');
    const draft = fs.readFileSync('$DRAFT', 'utf8').trimEnd();
    // Insert after '# Changelog' heading (first line)
    const lines = changelog.split('\n');
    const titleIdx = lines.findIndex(l => l.startsWith('# '));
    if (titleIdx >= 0) {
      lines.splice(titleIdx + 1, 0, '', draft);
    } else {
      lines.unshift(draft, '');
    }
    fs.writeFileSync('$CHANGELOG', lines.join('\n'));
  "
else
  { echo "# Changelog"; echo ""; cat "$DRAFT"; } > "$CHANGELOG"
fi
rm -f "$DRAFT"
echo "Updated CHANGELOG.md"

# --- Update package.json version ---
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo "Updated package.json to $VERSION"

# --- Commit + tag + push ---
git add package.json "$CHANGELOG"
git commit -m "release: $TAG"
NOTES=$(printf '%s\n' "${CHANGES[@]}" | sed 's/^/- /')
git tag -m "$TAG

$NOTES" "$TAG"
git push
git push origin "$TAG"
echo "Pushed commit and tag $TAG"

# --- Create GitHub release ---
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
