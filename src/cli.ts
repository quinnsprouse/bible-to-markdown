import { setupCommand } from './commands/setup.js';

export async function runCLI(): Promise<void> {
  await setupCommand();
}