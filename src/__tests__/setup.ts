/**
 * Jest setup file for Bible-to-Markdown tests
 */

import * as fs from 'fs-extra';

// Global test configuration
jest.setTimeout(30000);

// Mock console to reduce noise during tests (unless explicitly testing console output)
const originalConsole = console;
beforeEach(() => {
  // Only mock console in unit tests, not integration tests
  if (!expect.getState().testPath?.includes('integration')) {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Clean up test outputs after each test
afterEach(async () => {
  const testOutputDirs = [
    'test-output',
    'test-linking-output', 
    'test-improved-output',
    'analyze-output',
    'test-linking-analysis'
  ];
  
  for (const dir of testOutputDirs) {
    if (await fs.pathExists(dir)) {
      await fs.remove(dir);
    }
  }
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidObsidianLink(): R;
      toHaveValidFootnoteStructure(): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeValidObsidianLink(received: string) {
    const obsidianLinkPattern = /^\[\[[^\]]+\]\]$/;
    const pass = obsidianLinkPattern.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Obsidian link`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Obsidian link`,
        pass: false,
      };
    }
  },
  
  toHaveValidFootnoteStructure(received: string) {
    // Check for footnote structure: [^N]: **TYPE** content
    const hasCorrectStart = received.match(/^\\[\\^\\d+\\]:/);
    const hasType = received.match(/:\\s*\\*\\*[A-Z]+\\*\\*/);
    const pass = hasCorrectStart && hasType;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to have valid footnote structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have valid footnote structure`,
        pass: false,
      };
    }
  }
});

export {};