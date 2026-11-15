// Removes build output so old builds don't pile up in dist/.
//   node scripts/clean-dist.cjs                    -> delete everything in dist/
//   node scripts/clean-dist.cjs --keep-installers  -> keep only the .exe files people need + latest.yml (auto-update)
const fs = require('fs')
const path = require('path')

const dist = path.join(__dirname, '..', 'dist')
const keepInstallers = process.argv.includes('--keep-installers')
if (!fs.existsSync(dist)) process.exit(0)

for (const name of fs.readdirSync(dist)) {
  if (keepInstallers && /\.(exe|yml)$/i.test(name) && name !== 'builder-debug.yml') continue
  try {
    fs.rmSync(path.join(dist, name), { recursive: true, force: true })
  } catch (e) {
    console.warn(`Could not remove dist/${name} (is BINDit running from it?): ${e.message}`)
  }
}
