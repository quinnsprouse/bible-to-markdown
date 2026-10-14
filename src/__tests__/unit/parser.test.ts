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

    it('should keep the number in numbered book names', () => {
      const html = `
        <div class="chunk" id="netText_1_Chronicles_1">
          <div class="bodytext">
            <span class="netVerse" id="netText_1_Chronicles_1_1">Adam, Seth, Enosh,</span>
          </div>
        </div>
        <div class="chunk" id="netText_2_Chronicles_1">
          <div class="bodytext">
            <span class="netVerse" id="netText_2_Chronicles_1_1">Now Solomon the son of David</span>
          </div>
        </div>
      `;

      const chapters = parser.parseChapters(html);

      expect(chapters.map(c => c.book)).toEqual(['1 Chronicles', '2 Chronicles']);
    });

    it('should keep every word of multi-word book names', () => {
      const html = `
        <div class="chunk" id="netText_Song_of_Solomon_1">
          <div class="bodytext">
            <span class="netVerse" id="netText_Song_of_Songs_1_1" alt="Song_of_Songs_1_1">The Song of Songs</span>
          </div>
        </div>
      `;

      const chapters = parser.parseChapters(html);

      expect(chapters[0].book).toBe('Song of Solomon');
      expect(chapters[0].chapter).toBe(1);
    });

    it('should read verse numbers when the verse number sits outside the verse span', () => {
      // Mirrors the live API markup, where verses after the first in a
      // paragraph have their verseNumber as a preceding sibling
      const html = `
        <div class="chunk" id="net_strongs2_Genesis_1">
          <p class="bodytext">
            <span id="net_strongs2_Genesis_1_2" alt="Genesis_1_2" class="netVerse "><span class="vref"><span class="verseNumber">2</span></span> Verse two.</span>
            <span class="vref"><span class="verseNumber">3</span></span>
            <span id="net_strongs2_Genesis_1_3" alt="Genesis_1_3" class="netVerse ">Verse three.</span>
          </p>
        </div>
      `;

      const chapters = parser.parseChapters(html);
      const verses = chapters[0].sections[0].verses;

      expect(chapters[0].book).toBe('Genesis');
      expect(verses.map(v => v.number)).toEqual([2, 3]);
    });

    it('should keep verses that follow a section title nested inside a paragraph', () => {
      // Mirrors 1 Kings 3 in the NASB markup: the parser closes the <p> at the
      // nested <div>, leaving later verses outside any .bodytext
      const html = `
        <div class="chunk" id="netText_1_Kings_3">
          <p class="bodytext">
            <span id="netText_1_Kings_3_5" alt="1_Kings_3_5" class="netVerse ">Verse five.</span>
            <span class="vref"><span class="verseNumber">6</span></span>
            <div class="paragraphtitle"><h3></h3></div>
            <span id="netText_1_Kings_3_6" alt="1_Kings_3_6" class="netVerse ">Verse six.</span>
            <span id="netText_1_Kings_3_7" alt="1_Kings_3_7" class="netVerse ">Verse seven.</span>
          </p>
        </div>
      `;

      const chapters = parser.parseChapters(html);
      const verseNumbers = chapters[0].sections.flatMap(s => s.verses.map(v => v.number));

      expect(verseNumbers).toEqual([5, 6, 7]);
    });

    it('should include poetry and merge its line fragments into one verse', () => {
      // Mirrors Genesis 1:27 in the NET markup: one span per poetic line,
      // all sharing the verse ID, inside p.poetry rather than p.bodytext
      const html = `
        <div class="chunk" id="netText_Genesis_1">
          <p class="bodytext">
            <span id="netText_Genesis_1_26" alt="Genesis_1_26" class="netVerse ">Verse twenty-six.</span>
          </p>
          <p class="poetry"> <span id="netText_Genesis_1_27" alt="Genesis_1_27" class="netVerse ">God created humankind<sup> <a href="#" class="netNoteSuper">53</a></sup> in his own image,
          <p class="poetry"> <span id="netText_Genesis_1_27" alt="Genesis_1_27" class="netVerse ">in the image of God he created them,<sup> <a href="#" class="netNoteSuper">54</a></sup>
          <p class="poetry"> <span id="netText_Genesis_1_27" alt="Genesis_1_27" class="netVerse ">male and female he created them.</span></p>
        </div>
      `;

      const chapters = parser.parseChapters(html);
      const verses = chapters[0].sections[0].verses;

      expect(verses.map(v => v.number)).toEqual([26, 27]);
      expect(verses[1].text).toBe('God created humankind in his own image, in the image of God he created them, male and female he created them.');
      expect(verses[1].footnoteNumbers).toEqual([53, 54]);
    });
  });

  describe('getVersionHtml', () => {
    // The API puts the requested translation (bible1Translation) in bible1
    it('should return bible1 for NET parser', () => {
      const netParser = createParser('NET');
      const netHtml = '<div>NET content</div>';
      const nasbHtml = '<div>NASB content</div>';

      const result = netParser.getVersionHtml(netHtml, nasbHtml);

      expect(result).toBe(netHtml);
    });

    it('should return bible1 for NASB parser', () => {
      const nasbParser = createParser('NASB');
      const nasbHtml = '<div>NASB content</div>';
      const netHtml = '<div>NET content</div>';

      const result = nasbParser.getVersionHtml(nasbHtml, netHtml);

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