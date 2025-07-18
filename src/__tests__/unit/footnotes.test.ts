/**
 * Unit tests for footnotes functionality
 */

import { createFootnotesParser } from '../../services/footnotes.js';

describe('Footnotes Parser', () => {
  let footnotesParser: ReturnType<typeof createFootnotesParser>;

  beforeEach(() => {
    footnotesParser = createFootnotesParser();
  });

  describe('parseFootnotes', () => {
    it('should parse basic footnote structure', () => {
      const html = `
        <div class="note">
          <sup><span class="noteNoteSuper" id="note_1">1</span></sup>
          <span class="notetype">sn</span>
          This is a study note.
        </div>
      `;

      const footnotes = footnotesParser.parseFootnotes(html);

      expect(footnotes).toHaveLength(1);
      expect(footnotes[0]).toMatchObject({
        id: 'note_1',
        number: 1,
        type: 'sn',
        content: expect.stringContaining('This is a study note')
      });
    });

    it('should parse footnotes with verse references', () => {
      const html = `
        <div class="note">
          <sup><span class="noteNoteSuper" id="note_1">1</span></sup>
          <span class="notetype">sn</span>
          See reference in <data ref="Bible:Jn 1:24">1:24</data>.
        </div>
      `;

      const footnotes = footnotesParser.parseFootnotes(html);

      expect(footnotes).toHaveLength(1);
      expect(footnotes[0].verseReferences).toHaveLength(1);
      expect(footnotes[0].verseReferences[0]).toMatchObject({
        book: 'John',
        chapter: 1,
        verse: 24,
        display: '1:24'
      });
    });

    it('should handle multiple verse references', () => {
      const html = `
        <div class="note">
          <sup><span class="noteNoteSuper" id="note_2">2</span></sup>
          <span class="notetype">tn</span>
          Compare <data ref="Bible:Mt 5:3">Mt 5:3</data> and <data ref="Bible:Lu 6:20">Lu 6:20</data>.
        </div>
      `;

      const footnotes = footnotesParser.parseFootnotes(html);

      expect(footnotes).toHaveLength(1);
      expect(footnotes[0].verseReferences).toHaveLength(2);
      expect(footnotes[0].verseReferences[0].book).toBe('Matthew');
      expect(footnotes[0].verseReferences[1].book).toBe('Luke');
    });

    it('should skip footnotes with invalid numbers', () => {
      const html = `
        <div class="note">
          <sup><span class="noteNoteSuper" id="note_invalid"></span></sup>
          <span class="notetype">sn</span>
          This should be skipped.
        </div>
        <div class="note">
          <sup><span class="noteNoteSuper" id="note_1">1</span></sup>
          <span class="notetype">sn</span>
          This should be included.
        </div>
      `;

      const footnotes = footnotesParser.parseFootnotes(html);

      expect(footnotes).toHaveLength(1);
      expect(footnotes[0].number).toBe(1);
    });

    it('should expand book codes correctly', () => {
      const html = `
        <div class="note">
          <sup><span class="noteNoteSuper" id="note_1">1</span></sup>
          <span class="notetype">sn</span>
          References: <data ref="Bible:1Co 7:1">1Co 7:1</data> and <data ref="Bible:Ge 20:6">Ge 20:6</data>.
        </div>
      `;

      const footnotes = footnotesParser.parseFootnotes(html);
      const refs = footnotes[0].verseReferences;

      expect(refs).toHaveLength(2);
      expect(refs[0].book).toBe('1 Corinthians');
      expect(refs[1].book).toBe('Genesis');
    });
  });

  describe('verse reference parsing', () => {
    it('should parse data-ref attributes correctly', () => {
      const html = `
        <div class="note">
          <sup><span class="noteNoteSuper" id="note_1">1</span></sup>
          <span class="notetype">sn</span>
          See <data ref="Bible:Jn 3:16">John 3:16</data> for context.
        </div>
      `;

      const footnotes = footnotesParser.parseFootnotes(html);
      const ref = footnotes[0].verseReferences[0];

      expect(ref).toMatchObject({
        book: 'John',
        chapter: 3,
        verse: 16,
        display: 'John 3:16'
      });
    });

    it('should handle verse ranges', () => {
      const html = `
        <div class="note">
          <sup><span class="noteNoteSuper" id="note_1">1</span></sup>
          <span class="notetype">sn</span>
          See <data ref="Bible:Jn 3:16-18">John 3:16-18</data>.
        </div>
      `;

      const footnotes = footnotesParser.parseFootnotes(html);
      const ref = footnotes[0].verseReferences[0];

      expect(ref).toMatchObject({
        book: 'John',
        chapter: 3,
        verse: 16,
        endVerse: 18
      });
    });
  });
});