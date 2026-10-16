import type { RemoteProtocol } from '@shared/types'

/** Detect the protocol from a remote URL string. */
export function detectProtocol(url: string): RemoteProtocol {
  const u = url.trim()
  if (u.startsWith('https://') || u.startsWith('http://')) return 'https'
  if (u.startsWith('git@') || u.startsWith('ssh://')) return 'ssh'
  throw new Error(`Unsupported remote URL: ${url}`)
}

/** Convert an HTTPS URL to an SSH URL (git@host:path). */
export function httpsToSsh(url: string): string {
  let u = url.trim()
  // strip protocol
  u = u.replace(/^https?:\/\//, '')
  // drop embedded credentials
  u = u.replace(/^[^/@]+@/, '')
  // split host and path
  const slashIdx = u.indexOf('/')
  if (slashIdx < 0) return `git@${u}:`
  const host = u.slice(0, slashIdx)
  const path = u.slice(slashIdx + 1)
  // strip .git and trailing slashes
  const cleanPath = path.replace(/\.git$/, '').replace(/\/+$/, '')
  return `git@${host}:${cleanPath}`
}

/** Convert an SSH URL to an HTTPS URL. Mirrors toWebUrl() in gitService.ts. */
export function sshToHttps(url: string): string {
  let u = url.trim()
  const scp = u.match(/^[^@]+@([^:/]+):(.+)$/) // git@host:owner/repo(.git)
  if (scp) {
    u = `https://${scp[1]}/${scp[2]}`
  } else if (u.startsWith('ssh://')) {
    u = 'https://' + u.slice('ssh://'.length)
  } else if (u.startsWith('git://')) {
    u = 'https://' + u.slice('git://'.length)
  }
  // drop embedded credentials
  u = u.replace(/:\/\/[^/@]+@/, '://')
  // strip .git and trailing slashes
  u = u.replace(/\.git$/, '').replace(/\/+$/, '')
  return u
}

/** Extract the host (including port) from any HTTPS or SSH URL. */
export function extractHost(url: string): string {
  const u = url.trim()
  // scp-like: git@host:path (no port in scp format — use ~/.ssh/config)
  const scp = u.match(/^[^@]+@([^:/]+):/)
  if (scp) return scp[1]
  // ssh://host:port/path or https://host:port/path — include the port
  // so credential helper lookups match what git stores (host:port).
  const m = u.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/]+)/)
  if (m) return m[1]
  throw new Error(`Cannot extract host from: ${url}`)
}
