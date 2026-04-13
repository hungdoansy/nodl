// Post-pack hook for electron-builder:
// 1. Ensure the correct @esbuild platform binary is in the packaged app
// 2. Ad-hoc sign the app on macOS

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

// electron-builder arch enum → esbuild arch name
const ARCH_NAME = { 0: 'ia32', 1: 'x64', 2: 'armv7l', 3: 'arm64' }

function ensureEsbuildBinary(context) {
  // Determine what the TARGET platform needs (not the build machine)
  const targetPlatform = context.electronPlatformName          // 'darwin' | 'linux' | 'win32'
  const targetArch = ARCH_NAME[context.arch]                   // 'x64' | 'arm64'
  const esbuildPlatform = `${targetPlatform}-${targetArch}`    // e.g. 'darwin-x64'
  const esbuildVersion = require('esbuild/package.json').version

  console.log(`  • ensuring @esbuild/${esbuildPlatform}@${esbuildVersion} for target`)

  // Where the binary must end up inside the packaged app
  const appNodeModules = path.join(
    context.appOutDir,
    targetPlatform === 'darwin'
      ? `${context.packager.appInfo.productFilename}.app/Contents/Resources/app.asar.unpacked/node_modules`
      : 'resources/app.asar.unpacked/node_modules'
  )
  const destDir = path.join(appNodeModules, '@esbuild', esbuildPlatform)

  // Already present? (electron-builder may have resolved it)
  if (fs.existsSync(path.join(destDir, 'package.json'))) {
    console.log(`  • @esbuild/${esbuildPlatform} already in packaged app`)
    return
  }

  // Search local filesystem for the binary
  const esbuildDir = path.dirname(require.resolve('esbuild/package.json'))
  const searchPaths = [
    // Next to resolved esbuild in pnpm store (works when build arch == target arch)
    path.join(path.dirname(esbuildDir), '@esbuild', esbuildPlatform),
    // Workspace node_modules (CI cross-arch install puts it here)
    path.join(process.cwd(), 'node_modules', '@esbuild', esbuildPlatform),
    // Monorepo root node_modules
    path.resolve(process.cwd(), '..', '..', 'node_modules', '@esbuild', esbuildPlatform),
    // pnpm virtual store
    path.resolve(process.cwd(), '..', '..', 'node_modules', '.pnpm',
      `@esbuild+${esbuildPlatform}@${esbuildVersion}`, 'node_modules', '@esbuild', esbuildPlatform),
  ]

  for (const src of searchPaths) {
    const srcPkg = path.join(src, 'package.json')
    if (fs.existsSync(srcPkg)) {
      fs.mkdirSync(path.dirname(destDir), { recursive: true })
      fs.rmSync(destDir, { recursive: true, force: true })
      fs.cpSync(src, destDir, { recursive: true, dereference: true })
      // Ensure binary is executable
      const bin = path.join(destDir, 'bin', 'esbuild')
      if (fs.existsSync(bin)) fs.chmodSync(bin, 0o755)
      console.log(`  • copied @esbuild/${esbuildPlatform} from ${src}`)
      return
    }
  }

  // Not found locally — download it
  console.log(`  • @esbuild/${esbuildPlatform} not found locally, downloading...`)
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'esbuild-'))
  try {
    execSync(
      `npm pack @esbuild/${esbuildPlatform}@${esbuildVersion} --pack-destination "${tmpDir}"`,
      { stdio: 'pipe' }
    )
    const tgz = fs.readdirSync(tmpDir).find(f => f.endsWith('.tgz'))
    if (!tgz) throw new Error('npm pack produced no .tgz file')
    fs.mkdirSync(destDir, { recursive: true })
    execSync(`tar xzf "${path.join(tmpDir, tgz)}" -C "${destDir}" --strip-components=1`, { stdio: 'pipe' })
    // Ensure binary is executable
    const bin = path.join(destDir, 'bin', 'esbuild')
    if (fs.existsSync(bin)) fs.chmodSync(bin, 0o755)
    console.log(`  • downloaded and installed @esbuild/${esbuildPlatform}@${esbuildVersion}`)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

function adHocSign(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
  console.log(`  • ad-hoc signing  ${appPath}`)

  try {
    execSync(`codesign --force --deep -s - "${appPath}"`, { stdio: 'inherit' })
  } catch (err) {
    console.warn('  • ad-hoc signing failed (non-fatal):', err.message)
  }
}

exports.default = async function (context) {
  ensureEsbuildBinary(context)
  adHocSign(context)
}
