import { spawn, execFile } from 'child_process'
import { promisify } from 'util'
import { assertSafeGitUrl, assertSafeGitArg } from '../security'
import type { HttpsCredentialStatus, HttpsAccessResult } from '@shared/types'

const execFileAsync = promisify(execFile)

const CRED_HELPER =
  process.platform === 'darwin' ? 'osxkeychain' : process.platform === 'win32' ? 'manager' : 'store'

/**
 * Run `git credential <subcommand>` with a key-value block on stdin.
 * The password is piped via stdin (never as a command-line argument) so it
 * doesn't appear in process listings.
 */
function runCredential(subcommand: string, input: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-c', `credential.helper=${CRED_HELPER}`, 'credential', subcommand], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => { stdout += d })
    child.stderr.on('data', (d) => { stderr += d })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0 && subcommand !== 'fill') {
        reject(new Error(stderr.trim() || `git credential ${subcommand} failed`))
        return
      }
      resolve({ stdout, stderr })
    })
    child.stdin.write(input)
    child.stdin.end()
  })
}

function parseCredentialOutput(stdout: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of stdout.split('\n')) {
    const idx = line.indexOf('=')
    if (idx > 0) result[line.slice(0, idx)] = line.slice(idx + 1)
  }
  return result
}

export const credService = {
  async checkHttpsCredentials(host: string): Promise<HttpsCredentialStatus> {
    assertSafeGitArg(host, 'host')
    try {
      const { stdout } = await runCredential(
        'fill',
        `protocol=https\nhost=${host}\n\n`
      )
      const parsed = parseCredentialOutput(stdout)
      if (parsed.username) {
        return { host, stored: true, username: parsed.username }
      }
      return { host, stored: false }
    } catch {
      return { host, stored: false }
    }
  },

  async storeHttpsCredentials(host: string, username: string, password: string): Promise<void> {
    assertSafeGitArg(host, 'host')
    await runCredential(
      'approve',
      `protocol=https\nhost=${host}\nusername=${username}\npassword=${password}\n\n`
    )
  },

  async removeHttpsCredentials(host: string): Promise<void> {
    assertSafeGitArg(host, 'host')
    await runCredential('reject', `protocol=https\nhost=${host}\n\n`)
  },

  async testHttpsAccess(url: string): Promise<HttpsAccessResult> {
    assertSafeGitUrl(url)
    try {
      const { stdout } = await execFileAsync('git', [
        '-c', `credential.helper=${CRED_HELPER}`,
        'ls-remote', url
      ])
      // On success, try to extract the username from the credential store
      let username: string | undefined
      try {
        const host = new URL(url).host
        const credResult = await this.checkHttpsCredentials(host)
        username = credResult.username
      } catch { /* ignore */ }
      return { success: true, username }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { success: false, error: msg }
    }
  }
}
