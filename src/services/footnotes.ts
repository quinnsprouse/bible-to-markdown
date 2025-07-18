import * as cheerio from 'cheerio';
import { ParsedFootnote, VerseReference } from '../types/index.js';

export class FootnotesParser {
  parseFootnotes(html: string): ParsedFootnote[] {
    const $ = cheerio.load(html);
    const footnotes: ParsedFootnote[] = [];
    
    $('.note').each((_, noteEl) => {
      const $note = $(noteEl);
      
      // Extract footnote number
      const numberEl = $note.find('.noteNoteSuper');
      const numberText = numberEl.text().trim();
      const number = numberText ? parseInt(numberText) : null;
      const id = numberEl.attr('id') || `note_${number || 'unknown'}`;
      
      // Extract footnote type
      const typeEl = $note.find('.notetype');
      const type = typeEl.text().trim();
      
      // Extract content (everything after the type)
      const contentClone = $note.clone();
      contentClone.find('sup').remove();
      contentClone.find('.notetype').remove();
      
      let content = contentClone.text().trim();
      
      // Extract verse references
      const verseReferences = this.extractVerseReferences($note);
      
      // Clean up content
      content = content.replace(/\s+/g, ' ').trim();
      
      if (content && number !== null && !isNaN(number)) {
        footnotes.push({
          id,
          number,
          type,
          content,
          verseReferences
        });
      }
    });
    
    return footnotes;
  }
  
  private extractVerseReferences($note: cheerio.Cheerio<any>): VerseReference[] {
    const references: VerseReference[] = [];
    
    // Extract data-ref attributes (most explicit references)
    const html = $note.html() || '';
    const dataRefMatches = html.match(/<data ref="Bible:([^"]+)">([^<]+)<\/data>/g);
    
    if (dataRefMatches) {
      dataRefMatches.forEach(match => {
        const dataRefMatch = match.match(/^<data ref="Bible:([^"]+)">([^<]+)<\/data>$/);
        if (dataRefMatch) {
          const [, ref, display] = dataRefMatch;
          const parsed = this.parseDataRef(`Bible:${ref}`, display);
          if (parsed) {
            references.push(parsed);
          }
        }
      });
    }
    
    // Only look for additional references if no data-ref attributes were found
    // This prevents duplicates when both data-ref and text patterns match the same reference
    if (references.length === 0) {
      const text = $note.text();
      const additionalRefs = this.findBibleReferences(text);
      references.push(...additionalRefs);
    }
    
    return references;
  }
  
  private parseDataRef(ref: string, display: string): VerseReference | null {
    // Parse data-ref format: "Bible:Jn 1:24", "Bible:1Co 7:1", "Bible:Ge 20:6"
    const match = ref.match(/^Bible:(\w+)\s+(\d+):(\d+)(?:-(\d+))?$/);
    if (!match) return null;
    
    const [, bookCode, chapter, verse, endVerse] = match;
    const book = this.expandBookName(bookCode);
    
    return {
      book,
      chapter: parseInt(chapter),
      verse: parseInt(verse),
      endVerse: endVerse ? parseInt(endVerse) : undefined,
      display
    };
  }
  
  
  private findBibleReferences(text: string): VerseReference[] {
    const references: VerseReference[] = [];
    
    // Common Bible reference patterns
    const patterns = [
      // "Gen 20:16", "1 Cor 7:1", "Matt 11:29"
      /\b(\d?\s*\w+)\s+(\d+):(\d+)(?:-(\d+))?\b/g,
      // "Ps 68:18", "Isa 44:26"
      /\b(\w+)\s+(\d+):(\d+)(?:-(\d+))?\b/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [display, bookName, chapter, verse, endVerse] = match;
        const book = this.expandBookName(bookName.trim());
        
        if (this.isValidBookName(book)) {
          references.push({
            book,
            chapter: parseInt(chapter),
            verse: parseInt(verse),
            endVerse: endVerse ? parseInt(endVerse) : undefined,
            display
          });
        }
      }
    });
    
    return references;
  }
  
  private expandBookName(code: string): string {
    const bookMap: { [key: string]: string } = {
      'Mt': 'Matthew',
      'Mk': 'Mark',
      'Lk': 'Luke',
      'Lu': 'Luke',
      'Jn': 'John',
      'Ac': 'Acts',
      'Ro': 'Romans',
      '1Co': '1 Corinthians',
      '2Co': '2 Corinthians',
      'Ga': 'Galatians',
      'Eph': 'Ephesians',
      'Php': 'Philippians',
      'Col': 'Colossians',
      '1Th': '1 Thessalonians',
      '2Th': '2 Thessalonians',
      '1Ti': '1 Timothy',
      '2Ti': '2 Timothy',
      'Tit': 'Titus',
      'Phm': 'Philemon',
      'Heb': 'Hebrews',
      'Jas': 'James',
      '1Pe': '1 Peter',
      '2Pe': '2 Peter',
      '1Jn': '1 John',
      '2Jn': '2 John',
      '3Jn': '3 John',
      'Jud': 'Jude',
      'Re': 'Revelation',
      'Ge': 'Genesis',
      'Ex': 'Exodus',
      'Le': 'Leviticus',
      'Nu': 'Numbers',
      'De': 'Deuteronomy',
      'Jos': 'Joshua',
      'Jdg': 'Judges',
      'Ru': 'Ruth',
      '1Sa': '1 Samuel',
      '2Sa': '2 Samuel',
      '1Ki': '1 Kings',
      '2Ki': '2 Kings',
      '1Ch': '1 Chronicles',
      '2Ch': '2 Chronicles',
      'Ezr': 'Ezra',
      'Ne': 'Nehemiah',
      'Es': 'Esther',
      'Job': 'Job',
      'Ps': 'Psalms',
      'Pr': 'Proverbs',
      'Ec': 'Ecclesiastes',
      'So': 'Song of Solomon',
      'Is': 'Isaiah',
      'Jer': 'Jeremiah',
      'La': 'Lamentations',
      'Eze': 'Ezekiel',
      'Da': 'Daniel',
      'Ho': 'Hosea',
      'Joe': 'Joel',
      'Am': 'Amos',
      'Ob': 'Obadiah',
      'Jon': 'Jonah',
      'Mic': 'Micah',
      'Na': 'Nahum',
      'Hab': 'Habakkuk',
      'Zep': 'Zephaniah',
      'Hag': 'Haggai',
      'Zec': 'Zechariah',
      'Mal': 'Malachi'
    };
    
    return bookMap[code] || code;
  }
  
  private isValidBookName(name: string): boolean {
    const validBooks = [
      'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
      'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
      '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
      'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms',
      'Proverbs', 'Ecclesiastes', 'Song of Solomon',
      'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
      'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
      'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
      'Matthew', 'Mark', 'Luke', 'John', 'Acts',
      'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
      'Ephesians', 'Philippians', 'Colossians',
      '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy',
      'Titus', 'Philemon', 'Hebrews', 'James',
      '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
      'Jude', 'Revelation'
    ];
    
    return validBooks.includes(name);
  }
}

export function createFootnotesParser(): FootnotesParser {
  return new FootnotesParser();
}