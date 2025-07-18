import chalk from 'chalk';
import ora, { Ora } from 'ora';

interface ProgressState {
  current: number;
  total: number;
  stage: string;
  detail?: string;
}

export class Logger {
  private spinner: Ora | null = null;
  private progress: ProgressState | null = null;

  success(message: string): void {
    console.log(chalk.green('✓'), chalk.green(message));
  }

  error(message: string): void {
    console.log(chalk.red('✗'), chalk.red(message));
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), chalk.blue(message));
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠'), chalk.yellow(message));
  }

  startSpinner(message: string): void {
    this.spinner = ora({
      text: message,
      color: 'cyan',
      spinner: 'dots'
    }).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  succeedSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  failSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  startProgress(stage: string, total: number): void {
    this.progress = {
      current: 0,
      total,
      stage,
    };
    this.updateProgressDisplay();
  }

  updateProgress(current: number, detail?: string): void {
    if (this.progress) {
      this.progress.current = current;
      this.progress.detail = detail;
      this.updateProgressDisplay();
    }
  }

  incrementProgress(detail?: string): void {
    if (this.progress) {
      this.progress.current++;
      this.progress.detail = detail;
      this.updateProgressDisplay();
    }
  }

  finishProgress(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message || `${this.progress?.stage} completed`);
      this.spinner = null;
    }
    this.progress = null;
  }

  private updateProgressDisplay(): void {
    if (!this.progress) return;

    const { current, total, stage, detail } = this.progress;
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(current, total);
    
    let text = `${stage} ${progressBar} ${current}/${total} (${percentage}%)`;
    if (detail) {
      text += ` - ${detail}`;
    }

    if (this.spinner) {
      this.spinner.text = text;
    } else {
      this.spinner = ora({
        text,
        color: 'cyan',
        spinner: 'dots'
      }).start();
    }
  }

  private createProgressBar(current: number, total: number, width: number = 20): string {
    const filled = Math.round((current / total) * width);
    const empty = width - filled;
    const bar = chalk.cyan('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
    return `[${bar}]`;
  }

  // Enhanced logging with context
  logStageStart(stage: string): void {
    console.log();
    console.log(chalk.bold.cyan(`🚀 ${stage}`));
    console.log(chalk.dim('─'.repeat(50)));
  }

  logStageComplete(stage: string, stats?: { files?: number; size?: number; duration?: number }): void {
    console.log(chalk.green(`✓ ${stage} completed`));
    if (stats) {
      if (stats.files) {
        console.log(chalk.dim(`   Files: ${stats.files}`));
      }
      if (stats.size) {
        console.log(chalk.dim(`   Size: ${(stats.size / 1024).toFixed(1)}KB`));
      }
      if (stats.duration) {
        console.log(chalk.dim(`   Duration: ${(stats.duration / 1000).toFixed(1)}s`));
      }
    }
    console.log();
  }

  logBookProgress(bookName: string, currentBook: number, totalBooks: number): void {
    const percentage = Math.round((currentBook / totalBooks) * 100);
    console.log(chalk.blue(`📖 ${bookName} (${currentBook}/${totalBooks} - ${percentage}%)`));
  }
}

export const logger = new Logger();