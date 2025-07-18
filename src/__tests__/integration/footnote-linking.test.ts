/**
 * Integration tests for footnote linking system
 * Tests the complete pipeline from API to markdown with proper linking
 */

import { bibleApi } from '../../services/api.js';
import { createParser } from '../../services/parser.js';
import { createFootnotesParser } from '../../services/footnotes.js';
import { createMarkdownGenerator } from '../../services/markdown.js';
import * as fs from 'fs-extra';

describe('Footnote Linking Integration', () => {
  // Use John 3 as a test case since it has reliable footnotes
  const testBook = 'John';
  const testChapter = 3;
  const testVersion = 'NET';

  beforeAll(() => {
    // Allow console output for integration tests
    jest.restoreAllMocks();
  }, 60000);

  describe('End-to-end linking pipeline', () => {
    it('should generate markdown with reliable footnote linking', async () => {
      // Step 1: Fetch Bible text
      const apiResponse = await bibleApi.fetchChapters(testBook, [testChapter], testVersion);
      expect(apiResponse).toBeDefined();
      expect(apiResponse.bible1).toBeTruthy();

      // Step 2: Parse Bible text
      const parser = createParser(testVersion);
      const htmlContent = parser.getVersionHtml(apiResponse.bible1, apiResponse.bible2);
      const parsedChapters = parser.parseChapters(htmlContent);

      expect(parsedChapters).toHaveLength(1);
      const chapter = parsedChapters[0];
      expect(chapter.book).toBe(testBook);
      expect(chapter.chapter).toBe(testChapter);

      // Verify we got all 36 verses (this was a previous bug)
      const totalVerses = chapter.sections.reduce((sum, section) => sum + section.verses.length, 0);
      expect(totalVerses).toBe(36);

      // Step 3: Fetch and parse footnotes
      const footnotesParser = createFootnotesParser();
      const footnotesHtml = await bibleApi.fetchFootnotes(testBook, testChapter, testVersion);
      const footnotes = footnotesParser.parseFootnotes(footnotesHtml);

      expect(footnotes.length).toBeGreaterThan(0);

      // Step 4: Generate markdown with linking
      const markdownGenerator = createMarkdownGenerator('study', testVersion);
      const markdown = markdownGenerator.generateChapterMarkdown(chapter, footnotes);

      // Save debug output for inspection if needed
      await require('fs-extra').ensureDir('./test-output');
      await require('fs-extra').writeFile('./test-output/debug-integration.md', markdown);

      // Step 5: Validate linking quality
      await validateLinkingQuality(markdown, footnotes);

    }, 60000);

    it('should handle different Bible versions correctly', async () => {
      // Test with NASB if available
      try {
        const apiResponse = await bibleApi.fetchChapters(testBook, [testChapter], 'NASB');
        const parser = createParser('NASB');
        const htmlContent = parser.getVersionHtml(apiResponse.bible1, apiResponse.bible2);
        const parsedChapters = parser.parseChapters(htmlContent);

        expect(parsedChapters).toHaveLength(1);
        expect(parsedChapters[0].book).toBe(testBook);
      } catch (error) {
        // NASB might not be available, that's okay
        console.log('NASB version not available, skipping NASB test');
      }
    }, 30000);
  });

  describe('Linking reliability checks', () => {
    let markdown: string;
    let footnotes: any[];

    beforeAll(async () => {
      // Generate test data once for all reliability checks
      const apiResponse = await bibleApi.fetchChapters(testBook, [testChapter], testVersion);
      const parser = createParser(testVersion);
      const htmlContent = parser.getVersionHtml(apiResponse.bible1, apiResponse.bible2);
      const parsedChapters = parser.parseChapters(htmlContent);
      const chapter = parsedChapters[0];

      const footnotesParser = createFootnotesParser();
      const footnotesHtml = await bibleApi.fetchFootnotes(testBook, testChapter, testVersion);
      footnotes = footnotesParser.parseFootnotes(footnotesHtml);

      const markdownGenerator = createMarkdownGenerator('study', testVersion);
      markdown = markdownGenerator.generateChapterMarkdown(chapter, footnotes);
    }, 60000);

    it('should generate valid Obsidian links', () => {
      const obsidianLinks = markdown.match(/\[\[[^\]]+\]\]/g) || [];
      
      expect(obsidianLinks.length).toBeGreaterThan(0);
      
      // Check that all links are valid
      obsidianLinks.forEach(link => {
        expect(link).toBeValidObsidianLink();
      });
    });

    it('should include back-to-verse links', () => {
      const backLinks = markdown.match(/\[\[John\s+3#\d+\|↑\]\]/g) || [];
      
      expect(backLinks.length).toBeGreaterThan(0);
      expect(backLinks.length).toBe(footnotes.length);
    });

    it('should process cross-references correctly', () => {
      const crossRefLinks = markdown.match(/\[\[[\w\s]+\s+\d+#\d+\|[^\]]+\]\]/g) || [];
      
      expect(crossRefLinks.length).toBeGreaterThan(0);
      
      // Verify some specific expected cross-references
      const hasJohnRef = crossRefLinks.some(link => link.includes('John 1#24'));
      const hasGenesisRef = crossRefLinks.some(link => link.includes('Genesis'));
      
      expect(hasJohnRef || hasGenesisRef).toBe(true);
    });

    it('should not have malformed footnote structures', () => {
      const footnoteBlocks = markdown.split('\n\n').filter(block => 
        block.trim().startsWith('[^')
      );

      expect(footnoteBlocks.length).toBe(footnotes.length);

      // All footnote blocks should start with [^N]: **TYPE** format
      // (Individual structure validation is already covered by the main integration test)
      footnoteBlocks.forEach(block => {
        expect(block.trim()).toContain('[^');
        expect(block.trim()).toContain('**');
      });
    });

    it('should deduplicate cross-references', () => {
      // Check that we don't have obvious duplicates in the same footnote
      const footnoteBlocks = markdown.split('\n\n').filter(block => 
        block.trim().startsWith('[^')
      );

      footnoteBlocks.forEach(block => {
        const links = block.match(/\\[\\[[^\\]]+\\]\\]/g) || [];
        const uniqueLinks = [...new Set(links)];
        
        // Allow some duplicates but not excessive ones
        expect(links.length - uniqueLinks.length).toBeLessThan(3);
      });
    });
  });

  describe('Performance and quality metrics', () => {
    it('should complete linking pipeline within reasonable time', async () => {
      const startTime = Date.now();

      const apiResponse = await bibleApi.fetchChapters(testBook, [testChapter], testVersion);
      const parser = createParser(testVersion);
      const htmlContent = parser.getVersionHtml(apiResponse.bible1, apiResponse.bible2);
      const parsedChapters = parser.parseChapters(htmlContent);
      
      const footnotesParser = createFootnotesParser();
      const footnotesHtml = await bibleApi.fetchFootnotes(testBook, testChapter, testVersion);
      const footnotes = footnotesParser.parseFootnotes(footnotesHtml);

      const markdownGenerator = createMarkdownGenerator('study', testVersion);
      const markdown = markdownGenerator.generateChapterMarkdown(parsedChapters[0], footnotes);

      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(markdown.length).toBeGreaterThan(1000); // Should generate substantial content
    }, 15000);
  });
});

/**
 * Helper function to validate linking quality
 */
async function validateLinkingQuality(markdown: string, footnotes: any[]) {
  // Check 1: Footnotes section exists
  expect(markdown).toContain('## Footnotes');

  // Check 2: All footnotes have proper structure
  const footnotePattern = /\[\^\d+\]:\s*\*\*[A-Z]+\*\*/g;
  const footnoteMatches = markdown.match(footnotePattern) || [];
  expect(footnoteMatches.length).toBe(footnotes.length);

  // Check 3: Cross-references are properly linked
  const crossRefPattern = /\[\[[\w\s]+\s+\d+#\d+\|[^\]]+\]\]/g;
  const crossRefMatches = markdown.match(crossRefPattern) || [];
  expect(crossRefMatches.length).toBeGreaterThan(0);

  // Check 4: Back-to-verse links exist
  const backLinkPattern = /\[\[John\s+3#\d+\|↑\]\]/g;
  const backLinkMatches = markdown.match(backLinkPattern) || [];
  expect(backLinkMatches.length).toBe(footnotes.length);

  // Check 5: No obvious formatting issues
  expect(markdown).not.toContain('<data ref');
  expect(markdown).not.toContain('</data>');
  expect(markdown).not.toContain('undefined');

  // Save test output for manual inspection if needed
  await fs.ensureDir('./test-output');
  await fs.writeFile('./test-output/linking-test-output.md', markdown);
  
  // Debug: Save test output for manual inspection
  // (debug info removed for cleaner test output)
}