/**
 * Unit tests for HTML parser functionality
 */

import { createParser } from '../../services/parser.js';

describe('Bible Parser', () => {
  let parser: ReturnType<typeof createParser>;

  beforeEach(() => {
    parser = createParser('NET');
  });

  describe('parseChapters', () => {
    it('should parse basic chapter structure', () => {
      const html = `
        <div class="chunk" id="netText_John_3">
          <div class="bodytext">
            <span class="netVerse" id="netText_John_3_1">
              <span class="chapterNumber">3</span>
              Sample verse text.
            </span>
          </div>
        </div>
      `;

      const chapters = parser.parseChapters(html);

      expect(chapters).toHaveLength(1);
      expect(chapters[0]).toMatchObject({
        book: 'John',
        chapter: 3,
        sections: expect.any(Array)
      });
    });

    it('should parse verses correctly', () => {
      const html = `
        <div class="chunk" id="netText_John_3">
          <div class="bodytext">
            <span class="netVerse" id="netText_John_3_1">
              <span class="chapterNumber">3</span>
              First verse text.
            </span>
            <span class="netVerse" id="netText_John_3_2">
              Second verse text.
            </span>
            <span class="netVerse" id="netText_John_3_3">
              <span class="verseNumber">3</span>
              Third verse text.
            </span>
          </div>
        </div>
      `;

      const chapters = parser.parseChapters(html);
      const verses = chapters[0].sections[0].verses;

      expect(verses).toHaveLength(3);
      expect(verses[0].number).toBe(1);
      expect(verses[1].number).toBe(2);
      expect(verses[2].number).toBe(3);
    });

    it('should parse sections with titles', () => {
      const html = `
        <div class="chunk" id="netText_John_3">
          <div class="paragraphtitle">
            <h3>First Section</h3>
          </div>
          <div class="bodytext">
            <span class="netVerse" id="netText_John_3_1">
              <span class="chapterNumber">3</span>
              First verse.
            </span>
          </div>
          <div class="paragraphtitle">
            <h3>Second Section</h3>
          </div>
          <div class="bodytext">
            <span class="netVerse" id="netText_John_3_2">
              Second verse.
            </span>
          </div>
        </div>
      `;

      const chapters = parser.parseChapters(html);
      const sections = chapters[0].sections;

      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('First Section');
      expect(sections[1].title).toBe('Second Section');
      expect(sections[0].verses).toHaveLength(1);
      expect(sections[1].verses).toHaveLength(1);
    });

    it('should extract verse numbers from IDs when explicit numbers are missing', () => {
      const html = `
        <div class="chunk" id="netText_John_3">
          <div class="bodytext">
            <span class="netVerse" id="netText_John_3_5">
              Verse without explicit number.
            </span>
            <span class="netVerse" id="netText_John_3_10">
              Another verse without number.
            </span>
          </div>
        </div>
      `;

      const chapters = parser.parseChapters(html);
      const verses = chapters[0].sections[0].verses;

      expect(verses).toHaveLength(2);
      expect(verses[0].number).toBe(5);
      expect(verses[1].number).toBe(10);
    });

    it('should clean verse text properly', () => {
      const html = `
        <div class="chunk" id="netText_John_3">
          <div class="bodytext">
            <span class="netVerse" id="netText_John_3_1">
              <span class="vref">1</span>
              <sup>footnote</sup>
              Clean text here.
              <a class="netNoteSuper">note</a>
              <st>strong</st>
            </span>
          </div>
        </div>
      `;

      const chapters = parser.parseChapters(html);
      const verse = chapters[0].sections[0].verses[0];

      expect(verse.text).toBe('Clean text here. strong');
      expect(verse.text).not.toContain('<span');
      expect(verse.text).not.toContain('<sup>');
      expect(verse.text).not.toContain('<a');
    });
  });

  describe('getVersionHtml', () => {
    it('should return NET version for NET parser', () => {
      const netParser = createParser('NET');
      const netHtml = '<div>NET content</div>';
      const nasbHtml = '<div>NASB content</div>';

      const result = netParser.getVersionHtml(netHtml, nasbHtml);

      expect(result).toBe(netHtml);
    });

    it('should return NASB version for NASB parser', () => {
      const nasbParser = createParser('NASB');
      const netHtml = '<div>NET content</div>';
      const nasbHtml = '<div>NASB content</div>';

      const result = nasbParser.getVersionHtml(netHtml, nasbHtml);

      expect(result).toBe(nasbHtml);
    });
  });

  describe('edge cases', () => {
    it('should handle empty HTML gracefully', () => {
      const chapters = parser.parseChapters('');

      expect(chapters).toHaveLength(0);
    });

    it('should handle malformed chunk IDs', () => {
      const html = `
        <div class="chunk" id="invalid_id">
          <div class="bodytext">
            <span class="netVerse" id="netText_John_3_1">
              Text here.
            </span>
          </div>
        </div>
      `;

      const chapters = parser.parseChapters(html);

      expect(chapters).toHaveLength(0);
    });

    it('should skip verses without valid IDs', () => {
      const html = `
        <div class="chunk" id="netText_John_3">
          <div class="bodytext">
            <span class="netVerse" id="invalid_verse_id">
              Should be skipped.
            </span>
            <span class="netVerse" id="netText_John_3_1">
              Should be included.
            </span>
          </div>
        </div>
      `;

      const chapters = parser.parseChapters(html);
      const verses = chapters[0].sections[0].verses;

      expect(verses).toHaveLength(1);
      expect(verses[0].number).toBe(1);
    });
  });
});