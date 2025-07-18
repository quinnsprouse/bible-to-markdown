const { BibleApiService } = require('./dist/services/api.js');
const { createFootnotesParser } = require('./dist/services/footnotes.js');

async function debugFootnoteContent() {
  console.log('=== Debugging Footnote Content Processing ===');
  
  const api = new BibleApiService();
  const book = 'John';
  const chapter = 3;
  const version = 'NET';
  
  try {
    // Step 1: Fetch raw footnotes HTML
    console.log('1. Fetching raw footnotes HTML...');
    const footnotesHtml = await api.fetchFootnotes(book, chapter, version);
    
    // Skip the regex extraction, let's just see the parsed results
    
    // Step 3: Parse footnotes and see what content we get
    console.log('\\n2. Parsing footnotes...');
    const footnotesParser = createFootnotesParser();
    const footnotes = footnotesParser.parseFootnotes(footnotesHtml);
    
    // Find footnotes 32 and 33
    const footnote32 = footnotes.find(f => f.number === 32);
    const footnote33 = footnotes.find(f => f.number === 33);
    
    if (footnote32) {
      console.log('\\nFootnote 32:');
      console.log('  Content:', JSON.stringify(footnote32.content, null, 2));
      console.log('  Verse References:', JSON.stringify(footnote32.verseReferences, null, 2));
    }
    
    if (footnote33) {
      console.log('\\nFootnote 33:');
      console.log('  Content:', JSON.stringify(footnote33.content, null, 2));
      console.log('  Verse References:', JSON.stringify(footnote33.verseReferences, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugFootnoteContent();