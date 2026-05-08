import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Trigger a rebuild of the blog and restart the PM2 service
 * This should be called after content changes to update the live site
 */
export async function triggerRebuild(): Promise<void> {
  try {
    // Rebuild the blog (without type checking for speed)
    await execAsync('./node_modules/.bin/astro build --no-check', {
      cwd: '/root/astroblog',
    });

    // Restart the PM2 service
    await execAsync('/root/.nvm/versions/node/v24.13.1/bin/pm2 restart astro-blog', {
      cwd: '/root/astroblog',
    });

    console.log('Blog rebuilt and restarted successfully');
  } catch (error) {
    console.error('Failed to rebuild blog:', error);
    throw error;
  }
}
