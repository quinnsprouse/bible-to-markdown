import { select, input, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { logger } from '../utils/logger.js';
import { BIBLE_VERSIONS, OUTPUT_STYLES, DEFAULT_OUTPUT_DIR, BIBLE_BOOKS } from '../utils/constants.js';
import { BibleVersion, OutputStyle, SetupConfig } from '../types/index.js';
import { createConverter } from '../services/converter.js';

export async function setupCommand(): Promise<void> {
  console.clear();
  
  // Minimal, elegant banner
  const banner = figlet.textSync('bible2md', {
    font: 'Small',
    horizontalLayout: 'fitted'
  });
  
  console.log(gradient.morning.multiline(banner));
  console.log(chalk.dim('Convert Bible text to Markdown files\n'));

  try {
    const config = await runSetupFlow();
    
    if (config) {
      await executeConversion(config);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'User canceled') {
      console.log(chalk.dim('\nCanceled'));
      return;
    }
    logger.error('Setup failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

async function runSetupFlow(): Promise<SetupConfig | null> {
  // Version selection with minimal styling
  const version = await select({
    message: chalk.bold('Bible version'),
    choices: BIBLE_VERSIONS.map(v => ({
      name: `${v.code} ${chalk.dim('·')} ${v.name}`,
      value: v.code,
      description: chalk.dim(v.description)
    })),
    theme: {
      prefix: chalk.cyan('→'),
      style: {
        answer: chalk.cyan,
        message: chalk.white,
        description: chalk.gray
      }
    }
  }) as BibleVersion;

  // Style selection
  const style = await select({
    message: chalk.bold('Output style'),
    choices: OUTPUT_STYLES.map(s => ({
      name: `${s.name} ${chalk.dim('·')} ${s.description}`,
      value: s.code
    })),
    theme: {
      prefix: chalk.cyan('→'),
      style: {
        answer: chalk.cyan,
        message: chalk.white
      }
    }
  }) as OutputStyle;

  // Output directory
  const outputDir = await input({
    message: chalk.bold('Output directory'),
    default: DEFAULT_OUTPUT_DIR,
    theme: {
      prefix: chalk.cyan('→'),
      style: {
        answer: chalk.cyan,
        message: chalk.white,
        defaultAnswer: chalk.dim
      }
    },
    validate: (input: string) => {
      if (!input.trim()) {
        return 'Output directory is required';
      }
      return true;
    }
  });

  // Speed mode selection
  const speedMode = await select({
    message: chalk.bold('Download speed'),
    choices: [
      {
        name: `Fast ${chalk.dim('·')} Maximum speed (no footnotes in study mode)`,
        value: 'fast',
        description: chalk.dim('~1-2 minutes - Skips footnotes for maximum speed')
      },
      {
        name: `Balanced ${chalk.dim('·')} Full features with good performance`,
        value: 'balanced',
        description: chalk.dim('~3-4 minutes - Includes all footnotes and cross-references')
      }
    ],
    theme: {
      prefix: chalk.cyan('→'),
      style: {
        answer: chalk.cyan,
        message: chalk.white,
        description: chalk.gray
      }
    }
  }) as 'fast' | 'balanced';

  // Calculate scope
  const totalChapters = BIBLE_BOOKS.reduce((sum, book) => sum + book.chapters, 0);
  const estimatedSize = Math.round((totalChapters * 2.5) / 1024); // Rough estimate: 2.5KB per chapter
  const estimatedTime = speedMode === 'fast' 
    ? Math.round(totalChapters * 0.06 / 60)  // Fast mode: ~0.06 seconds per chapter
    : Math.round(totalChapters * 0.15 / 60); // Balanced: ~0.15 seconds per chapter
  
  // Clean summary display
  console.log();
  console.log(chalk.dim('─'.repeat(60)));
  console.log(chalk.white.bold('Conversion Summary'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(`Version     ${chalk.cyan(version)}`);
  console.log(`Style       ${chalk.cyan(style)}`);
  console.log(`Speed       ${chalk.cyan(speedMode)}`);
  console.log(`Output      ${chalk.cyan(outputDir)}`);
  console.log();
  console.log(chalk.white.bold('Scope'));
  console.log(`Books       ${chalk.yellow(BIBLE_BOOKS.length)} (Old Testament: 39, New Testament: 27)`);
  console.log(`Chapters    ${chalk.yellow(totalChapters)}`);
  console.log(`Est. Size   ${chalk.yellow(`~${estimatedSize}MB`)}`);
  console.log(`Est. Time   ${chalk.yellow(`~${estimatedTime} minutes`)}`);
  
  if (speedMode === 'fast' && style === 'study') {
    console.log();
    console.log(chalk.yellow('⚠  Note: Fast mode will skip footnotes to maximize speed'));
  }
  console.log(chalk.dim('─'.repeat(60)));

  // Confirm
  const shouldProceed = await confirm({
    message: chalk.bold('Continue?'),
    default: true,
    theme: {
      prefix: chalk.cyan('→'),
      style: {
        answer: chalk.cyan,
        message: chalk.white
      }
    }
  });

  if (!shouldProceed) {
    return null;
  }

  return {
    version,
    style,
    outputDir,
    speedMode
  };
}

async function executeConversion(config: SetupConfig): Promise<void> {
  console.log();
  
  try {
    const converter = createConverter(config);
    await converter.convert();
    
    // Clean success message
    console.log();
    console.log(chalk.green('✓ Bible converted successfully'));
    console.log(chalk.dim(`Files saved to: ${config.outputDir}`));
    console.log(chalk.dim(`Version: ${config.version} | Style: ${config.style}`));
    
  } catch (error) {
    console.log();
    console.log(chalk.red('✗ Conversion failed'));
    console.log(chalk.dim(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}