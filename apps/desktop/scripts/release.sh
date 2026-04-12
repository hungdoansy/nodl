#!/bin/bash
set -e

# Release script for nodl desktop app
# Usage: pnpm run release

# --- Prompt for version ---
CURRENT=$(node -p "require('./package.json').version")
echo "Current version: $CURRENT"
read -rp "New version (e.g. 1.1.0): " VERSION

if [[ -z "$VERSION" ]]; then
  echo "No version provided. Aborting."
  exit 1
fi

TAG="v$VERSION"
SHORT_VERSION=$(echo "$VERSION" | sed 's/\.[0-9]*$//')  # e.g. 1.1.0 -> 1.1

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

echo ""
echo "Will release $TAG"
echo "  - Update package.json version to $VERSION"
echo "  - Update Header.tsx version to v$SHORT_VERSION"
echo "  - Run lint + tests"
echo "  - Build + package"
echo "  - Commit, tag, push"
echo "  - Create GitHub release with artifacts"
echo ""
read -rp "Continue? (y/N) " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

# --- Update version in package.json ---
node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '$VERSION';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
echo "Updated package.json to $VERSION"

# --- Update version in Header.tsx ---
sed -i '' "s/v[0-9]*\.[0-9]*/v$SHORT_VERSION/" src/components/Header/Header.tsx
echo "Updated Header.tsx to v$SHORT_VERSION"

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

# --- Commit + tag + push ---
git add package.json src/components/Header/Header.tsx
git commit -m "release: $TAG"
git tag "$TAG"
git push
git push origin "$TAG"
echo "Pushed commit and tag $TAG"

# --- Create GitHub release ---
DMG=$(find dist -name "*.dmg" -type f 2>/dev/null | head -1)
if [[ -n "$DMG" ]]; then
  gh release create "$TAG" "$DMG" --title "$TAG" --generate-notes
  echo "Created GitHub release $TAG with $DMG"
else
  gh release create "$TAG" --title "$TAG" --generate-notes
  echo "Created GitHub release $TAG (no DMG found to attach)"
fi

echo ""
echo "Released $TAG"
