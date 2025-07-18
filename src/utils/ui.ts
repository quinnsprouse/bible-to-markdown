import chalk from 'chalk';
import cliProgress from 'cli-progress';
import Table from 'cli-table3';
import boxen from 'boxen';

export class ProgressBar {
  private bar: cliProgress.SingleBar;

  constructor() {
    this.bar = new cliProgress.SingleBar({
      format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} | {task}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
  }

  start(total: number, startValue: number = 0, task: string = ''): void {
    this.bar.start(total, startValue, { task });
  }

  update(value: number, task?: string): void {
    this.bar.update(value, task ? { task } : undefined);
  }

  stop(): void {
    this.bar.stop();
  }
}

export function createTable(headers: string[], rows: string[][]): string {
  const table = new Table({
    head: headers.map(h => chalk.cyan(h)),
    style: {
      head: [],
      border: []
    }
  });

  rows.forEach(row => table.push(row));
  return table.toString();
}

export function createBox(content: string, title?: string): string {
  return boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
    title: title ? chalk.bold(title) : undefined,
    titleAlignment: 'center'
  });
}

export function formatList(items: string[], bullet: string = '•'): string {
  return items.map(item => `  ${chalk.cyan(bullet)} ${item}`).join('\n');
}