export class AddonNotInstalledError extends Error {
  constructor() {
    super('Failed to find command. Make sure you have installed the addon in your world.');
    this.name = 'AddonNotInstalledError';
  }
}
