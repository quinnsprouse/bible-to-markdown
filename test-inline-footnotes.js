const { BibleApiService } = require('./dist/services/api.js');
const { createParser } = require('./dist/services/parser.js');
const { createFootnotesParser } = require('./dist/services/footnotes.js');
const { createMarkdownGenerator } = require('./dist/services/markdown.js');

async function testInlineFootnotes() {
  console.log('=== Testing Inline Footnote Cross-References ===');
  
  const api = new BibleApiService();
  const book = 'John';
  const chapter = 3;
  const version = 'NET';
  
  try {
    // Step 1: Fetch data
    console.log('1. Fetching data...');
    const apiResponse = await api.fetchSingleChapter(book, chapter, version);
    const footnotesHtml = await api.fetchFootnotes(book, chapter, version);
    
    // Step 2: Parse Bible text
    console.log('2. Parsing Bible text...');
    const parser = createParser(version);
    const htmlContent = parser.getVersionHtml(apiResponse.bible1, apiResponse.bible2);
    const parsedChapters = parser.parseChapters(htmlContent);
    const parsedChapter = parsedChapters[0];
    
    // Step 3: Parse footnotes
    console.log('3. Parsing footnotes...');
    const footnotesParser = createFootnotesParser();
    const footnotes = footnotesParser.parseFootnotes(footnotesHtml);
    
    // Step 4: Generate markdown
    console.log('4. Generating markdown with inline cross-references...');
    const markdownGenerator = createMarkdownGenerator('study', version);
    const markdown = markdownGenerator.generateChapterMarkdown(parsedChapter, footnotes);
    
    // Step 5: Check specific footnotes that should have inline references
    console.log('5. Checking inline cross-references in footnotes:');
    
    // Find footnotes section
    const footnotesSection = markdown.split('## Footnotes')[1];
    if (footnotesSection) {
      const footnoteLines = footnotesSection.split('\n').filter(line => line.startsWith('[^'));
      
      console.log(`Found ${footnoteLines.length} footnote definitions`);
      
      // Look for footnotes with inline cross-references (should contain wiki links but not back-links)
      const footnotesWithInlineRefs = footnoteLines.filter(line => {
        const hasWikiLinks = line.includes('[[') && line.includes('|');
        const isNotBackLink = !line.endsWith('|↑]]');
        const hasMultipleLinks = (line.match(/\[\[/g) || []).length > 1;
        return hasWikiLinks && (isNotBackLink || hasMultipleLinks);
      });
      
      console.log(`\\nFootnotes with inline cross-references: ${footnotesWithInlineRefs.length}`);
      
      if (footnotesWithInlineRefs.length > 0) {
        console.log('\\nSample footnotes with inline cross-references:');
        footnotesWithInlineRefs.slice(0, 5).forEach((line, i) => {
          console.log(`${i + 1}: ${line.trim()}`);
        });
      }
      
      // Check for old-style grouped references (should be eliminated)
      const footnotesWithGroupedRefs = footnoteLines.filter(line => 
        line.includes('([[') && line.includes(']], [[') && line.includes(']])') 
      );
      
      console.log(`\\nFootnotes with old grouped references: ${footnotesWithGroupedRefs.length} (should be 0)`);
      
      if (footnotesWithGroupedRefs.length > 0) {
        console.log('WARNING: Found footnotes with old grouped format:');
        footnotesWithGroupedRefs.slice(0, 3).forEach((line, i) => {
          console.log(`${i + 1}: ${line.trim()}`);
        });
      }
    }
    
    // Save test output
    require('fs').writeFileSync('./test-inline-footnotes-output.md', markdown);
    console.log('\\nTest output saved to: ./test-inline-footnotes-output.md');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testInlineFootnotes();