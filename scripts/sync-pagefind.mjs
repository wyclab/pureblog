/**
 * Regenerate the Pagefind search index from the built site and copy it into
 * `public/pagefind/` so it can be COMMITTED to the repo.
 *
 * Why: EdgeOne Pages' build environment cannot execute the pagefind binary
 * (sandboxed/musl image, and build failures are ignored during deploy), so the
 * index must be produced locally and shipped as plain static files.
 *
 * Usage:  bun run build && bun run sync:pagefind   (then commit + push)
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const siteDir = join('dist', 'client')
const builtIndex = join(siteDir, 'pagefind')
const publicIndex = join('public', 'pagefind')

if (!existsSync(join(siteDir, 'index.html'))) {
  console.error('[sync-pagefind] dist/client not found. Run `bun run build` first.')
  process.exit(1)
}

// 1. Regenerate the index from the freshly built HTML (overwrites any stale
//    copy that came from public/ during the build)
console.log('[sync-pagefind] generating index from dist/client ...')
const pagefindBin = join('node_modules', '.bin', 'pagefind')
execSync(`"${pagefindBin}" --site "${siteDir}"`, { stdio: 'inherit' })

// 2. Copy dist/client/pagefind -> public/pagefind
rmSync(publicIndex, { recursive: true, force: true })
cpSync(builtIndex, publicIndex, { recursive: true })

// 3. Report
let files = 0
let bytes = 0
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const s = statSync(p)
    if (s.isDirectory()) walk(p)
    else {
      files += 1
      bytes += s.size
    }
  }
}
walk(publicIndex)
console.log(
  `[sync-pagefind] done: ${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MB -> public/pagefind`
)
console.log('[sync-pagefind] now commit public/pagefind and push to redeploy.')
