/**
 * Unit tests for footnote linking functionality
 */

import { createMarkdownGenerator } from '../../services/markdown.js';
import { ParsedFootnote, VerseReference } from '../../types/index.js';

describe('Footnote Linking', () => {
  let markdownGenerator: ReturnType<typeof createMarkdownGenerator>;

  beforeEach(() => {
    markdownGenerator = createMarkdownGenerator('study', 'NET');
  });

  describe('generateVerseLink', () => {
    it('should generate correct Obsidian links for verse references', () => {
      const ref: VerseReference = {
        book: 'John',
        chapter: 3,
        verse: 16,
        display: 'John 3:16'
      };

      // Access private method for testing
      const link = (markdownGenerator as any).generateVerseLink(ref);

      expect(link).toBe('[[John 3#16|John 3:16]]');
      expect(link).toBeValidObsidianLink();
    });

    it('should handle verse ranges correctly', () => {
      const ref: VerseReference = {
        book: 'Matthew',
        chapter: 5,
        verse: 3,
        endVerse: 5,
        display: 'Matt 5:3-5'
      };

      const link = (markdownGenerator as any).generateVerseLink(ref);

      expect(link).toBe('[[Matthew 5#3|Matt 5:3-5]]');
    });

    it('should handle chapter-only references', () => {
      const ref: VerseReference = {
        book: 'Genesis',
        chapter: 1,
        verse: 0, // No specific verse
        display: 'Genesis 1'
      };

      const link = (markdownGenerator as any).generateVerseLink(ref);

      expect(link).toBe('[[Genesis 1|Genesis 1]]');
    });
  });

  describe('processFootnoteContent', () => {
    it('should convert data-ref elements to Obsidian links', () => {
      const content = 'See reference in <data ref="Bible:Jn 1:24">1:24</data> for context.';

      const processed = (markdownGenerator as any).processFootnoteContent(content);

      expect(processed).toContain('[[John 1#24|1:24]]');
      expect(processed).not.toContain('<data ref');
      expect(processed).not.toContain('</data>');
    });

    it('should handle multiple data-ref elements', () => {
      const content = 'Compare <data ref="Bible:Mt 5:3">Mt 5:3</data> with <data ref="Bible:Lu 6:20">Lu 6:20</data>.';

      const processed = (markdownGenerator as any).processFootnoteContent(content);

      expect(processed).toContain('[[Matthew 5#3|Mt 5:3]]');
      expect(processed).toContain('[[Luke 6#20|Lu 6:20]]');
    });

    it('should remove other HTML tags', () => {
      const content = 'Greek <i>pneuma</i> means <span class="greek">πνεῦμα</span>.';

      const processed = (markdownGenerator as any).processFootnoteContent(content);

      expect(processed).toBe('Greek pneuma means πνεῦμα.');
      expect(processed).not.toContain('<i>');
      expect(processed).not.toContain('<span');
    });
  });

  describe('getFootnoteVerseLink', () => {
    it('should generate back-to-verse links correctly', () => {
      const footnote: ParsedFootnote = {
        id: 'note_3',
        number: 3,
        type: 'sn',
        content: 'Test footnote',
        verseReferences: []
      };

      const verseLink = (markdownGenerator as any).getFootnoteVerseLink(footnote, 'John', 3);

      expect(verseLink).toBe('[[John 3#3|↑]]');
    });

    it('should handle complex footnote IDs', () => {
      const footnote: ParsedFootnote = {
        id: 'note_John_3_16',
        number: 16,
        type: 'tn',
        content: 'Test footnote',
        verseReferences: []
      };

      const verseLink = (markdownGenerator as any).getFootnoteVerseLink(footnote, 'John', 3);

      expect(verseLink).toBe('[[John 3#16|↑]]');
    });
  });

  describe('deduplicateReferences', () => {
    it('should remove duplicate verse references', () => {
      const references: VerseReference[] = [
        { book: 'John', chapter: 3, verse: 16, display: 'John 3:16' },
        { book: 'John', chapter: 3, verse: 16, display: 'Jn 3:16' }, // Duplicate
        { book: 'Matthew', chapter: 5, verse: 3, display: 'Matt 5:3' }
      ];

      const deduplicated = (markdownGenerator as any).deduplicateReferences(references);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].display).toBe('John 3:16'); // First occurrence kept
      expect(deduplicated[1].book).toBe('Matthew');
    });

    it('should preserve references to different verses', () => {
      const references: VerseReference[] = [
        { book: 'John', chapter: 3, verse: 16, display: 'John 3:16' },
        { book: 'John', chapter: 3, verse: 17, display: 'John 3:17' },
        { book: 'John', chapter: 4, verse: 16, display: 'John 4:16' }
      ];

      const deduplicated = (markdownGenerator as any).deduplicateReferences(references);

      expect(deduplicated).toHaveLength(3);
    });
  });

  describe('footnote markdown generation', () => {
    it('should generate minimal footnote structure', () => {
      const footnote: ParsedFootnote = {
        id: 'note_1',
        number: 1,
        type: 'sn',
        content: 'This is a study note about the text.',
        verseReferences: []
      };

      const markdown = markdownGenerator.generateChapterMarkdown(
        {
          book: 'John',
          chapter: 3,
          sections: [{
            verses: [{ number: 1, text: 'Sample verse text', id: 'v1' }]
          }]
        },
        [footnote]
      );

      expect(markdown).toContain('[^1]: **SN** This is a study note about the text. [[John 3#1|↑]]');
    });

    it('should include cross-references in footnotes', () => {
      const footnote: ParsedFootnote = {
        id: 'note_1',
        number: 1,
        type: 'sn',
        content: 'Reference to other passages.',
        verseReferences: [
          { book: 'Matthew', chapter: 5, verse: 3, display: 'Matt 5:3' },
          { book: 'Luke', chapter: 6, verse: 20, display: 'Luke 6:20' }
        ]
      };

      const markdown = markdownGenerator.generateChapterMarkdown(
        {
          book: 'John',
          chapter: 3,
          sections: [{
            verses: [{ number: 1, text: 'Sample verse text', id: 'v1' }]
          }]
        },
        [footnote]
      );

      expect(markdown).toContain('[[Matthew 5#3|Matt 5:3]]');
      expect(markdown).toContain('[[Luke 6#20|Luke 6:20]]');
      expect(markdown).toContain('[[John 3#1|↑]]');
    });
  });
});