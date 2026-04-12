// Post-pack hook for electron-builder:
// 1. Copy @esbuild platform binary into the packaged app (pnpm symlinks aren't followed)
// 2. Ad-hoc sign the app on macOS (free, no Apple Developer account needed)

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

function copyEsbuildBinary(context) {
  // Resolve the real esbuild module path (follows pnpm symlinks)
  const esbuildDir = path.dirname(require.resolve('esbuild/package.json'))
  const esbuildNodeModules = path.dirname(esbuildDir)

  // Find the @esbuild platform binary next to the resolved esbuild package
  const sourceEsbuildScope = path.join(esbuildNodeModules, '@esbuild')
  if (!fs.existsSync(sourceEsbuildScope)) {
    console.warn('  • @esbuild scope not found at', sourceEsbuildScope)
    return
  }

  // The packaged app's node_modules
  const appNodeModules = path.join(
    context.appOutDir,
    // macOS has the .app bundle structure
    process.platform === 'darwin'
      ? `${context.packager.appInfo.productFilename}.app/Contents/Resources/app.asar.unpacked/node_modules`
      : 'resources/app.asar.unpacked/node_modules'
  )

  const destEsbuildScope = path.join(appNodeModules, '@esbuild')

  // Copy each platform directory (e.g., darwin-arm64, linux-x64)
  const platforms = fs.readdirSync(sourceEsbuildScope)
  for (const platform of platforms) {
    const src = path.join(sourceEsbuildScope, platform)
    const dest = path.join(destEsbuildScope, platform)
    if (!fs.statSync(src).isDirectory()) continue
    if (fs.existsSync(dest)) continue // already there

    fs.mkdirSync(dest, { recursive: true })
    // Copy all files from the platform package
    for (const file of fs.readdirSync(src)) {
      const srcFile = path.join(src, file)
      const destFile = path.join(dest, file)
      if (fs.statSync(srcFile).isDirectory()) {
        fs.cpSync(srcFile, destFile, { recursive: true })
      } else {
        fs.copyFileSync(srcFile, destFile)
        // Preserve executable permission for the binary
        const mode = fs.statSync(srcFile).mode
        fs.chmodSync(destFile, mode)
      }
    }
    console.log(`  • copied @esbuild/${platform} into packaged app`)
  }
}

function adHocSign(context) {
  if (process.platform !== 'darwin') return

  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
  console.log(`  • ad-hoc signing  ${appPath}`)

  try {
    execSync(`codesign --force --deep -s - "${appPath}"`, { stdio: 'inherit' })
  } catch (err) {
    console.warn('  • ad-hoc signing failed (non-fatal):', err.message)
  }
}

exports.default = async function (context) {
  copyEsbuildBinary(context)
  adHocSign(context)
}
