// Ad-hoc sign the app after packing (free, no Apple Developer account needed).
// This prevents the "damaged and can't be opened" error on macOS Ventura+.
// Without any signature, macOS refuses to open the app entirely.
// Ad-hoc signing (codesign -s -) creates a valid local signature so users
// can open the app after running: xattr -cr /Applications/nodl.app

const { execSync } = require('child_process')

exports.default = async function (context) {
  if (process.platform !== 'darwin') return

  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`
  console.log(`  • ad-hoc signing  ${appPath}`)

  try {
    execSync(`codesign --force --deep -s - "${appPath}"`, { stdio: 'inherit' })
  } catch (err) {
    console.warn('  • ad-hoc signing failed (non-fatal):', err.message)
  }
}
