/** Known git hosting provider info for SSH settings links. */
export function getProviderInfo(host: string): { name: string; sshSettingsUrl?: string } {
  const known: Record<string, { name: string; sshSettingsUrl: string }> = {
    'github.com': { name: 'GitHub', sshSettingsUrl: 'https://github.com/settings/ssh' },
    'gitlab.com': { name: 'GitLab', sshSettingsUrl: 'https://gitlab.com/-/user_settings/ssh_keys' },
    'bitbucket.org': {
      name: 'Bitbucket',
      sshSettingsUrl: 'https://bitbucket.org/account/settings/ssh-keys/'
    }
  }
  return known[host] ?? { name: host, sshSettingsUrl: undefined }
}
