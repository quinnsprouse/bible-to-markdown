import { SetupConfig, ParsedChapter } from '../types/index.js';
import { bibleApi } from './api.js';
import { createParser } from './parser.js';
import { createMarkdownGenerator } from './markdown.js';
import { createFileWriter } from './fileWriter.js';
import { createFootnotesParser } from './footnotes.js';
import { logger } from '../utils/logger.js';
import { BIBLE_BOOKS } from '../utils/constants.js';
import chalk from 'chalk';

export class BibleConverter {
  private config: SetupConfig;
  private parser: any;
  private markdownGenerator: any;
  private fileWriter: any;
  private footnotesParser: any;

  constructor(config: SetupConfig) {
    this.config = config;
    this.parser = createParser(config.version);
    this.markdownGenerator = createMarkdownGenerator(config.style, config.version);
    this.fileWriter = createFileWriter(config.outputDir, config.version, config.style);
    this.footnotesParser = createFootnotesParser();
  }

  async convert(): Promise<void> {
    const startTime = Date.now();
    
    logger.logStageStart('Initializing Bible conversion');
    logger.startSpinner('Setting up output directory');
    
    await this.fileWriter.initialize();
    logger.succeedSpinner('Output directory ready');
    
    // Calculate total chapters for progress tracking
    const totalChapters = BIBLE_BOOKS.reduce((sum, book) => sum + book.chapters, 0);
    const allBooks: { name: string; chapters: number[] }[] = [];
    let processedChapters = 0;
    
    logger.logStageStart(`Converting entire Bible (${BIBLE_BOOKS.length} books, ${totalChapters} chapters)`);
    logger.startProgress('Processing all books', totalChapters);
    
    try {
      // Use different concurrency based on speed mode
      const speedMode = this.config.speedMode || 'balanced';
      const BOOK_CONCURRENCY = speedMode === 'fast' ? 20 : 10; // More aggressive in fast mode
      const bookBatches = [];
      
      for (let i = 0; i < BIBLE_BOOKS.length; i += BOOK_CONCURRENCY) {
        bookBatches.push(BIBLE_BOOKS.slice(i, i + BOOK_CONCURRENCY));
      }
      
      for (const bookBatch of bookBatches) {
        // Process books in this batch concurrently
        const bookPromises = bookBatch.map(async (bookInfo) => {
          const { name: bookName, chapters: totalBookChapters } = bookInfo;
          
          // Fetch all chapters for this book with increased batch size
          const apiResponses = await bibleApi.fetchBookChapters(
            bookName, 
            totalBookChapters, 
            this.config.version, 
            20 // Increased to 20 for maximum speed
          );
          
          // Parse all chapters from all batches
          const bookParsedChapters: ParsedChapter[] = [];
          
          for (const apiResponse of apiResponses) {
            const htmlContent = this.parser.getVersionHtml(apiResponse.bible1, apiResponse.bible2);
            const parsedChapters = this.parser.parseChapters(htmlContent);
            bookParsedChapters.push(...parsedChapters);
          }
          
          // Process chapters with parallel footnote fetching
          const processedBookChapters = await this.processChaptersInParallel(
            bookParsedChapters, 
            bookName
          );
          
          // Update progress
          processedChapters += processedBookChapters.length;
          logger.updateProgress(processedChapters, `Completed ${bookName} (${processedBookChapters.length} chapters)`);
          
          // Generate book index
          const bookIndexMarkdown = this.markdownGenerator.generateBookIndex(bookName, processedBookChapters);
          await this.fileWriter.writeBookIndex(bookName, bookIndexMarkdown);
          
          // Track book for master index
          const chapterNumbers = processedBookChapters.map(chapter => chapter.chapter);
          return { name: bookName, chapters: chapterNumbers };
        });
        
        // Wait for this batch to complete
        const completedBooks = await Promise.all(bookPromises);
        allBooks.push(...completedBooks);
      }
      
      // Generate master index and README
      logger.logStageStart('Generating index files');
      logger.startSpinner('Creating master index');
      
      const masterIndex = this.markdownGenerator.generateMasterIndex(allBooks);
      await this.fileWriter.writeMasterIndex(masterIndex);
      
      logger.updateSpinner('Creating README');
      await this.fileWriter.writeReadme();
      
      logger.succeedSpinner('Index files created');
      
      // Calculate final stats
      const endTime = Date.now();
      const duration = endTime - startTime;
      const stats = await this.fileWriter.getFileStats();
      
      logger.logStageComplete('Bible conversion', {
        files: stats.files,
        size: stats.size,
        duration
      });
      
      // Final success message
      console.log(chalk.green.bold('🎉 Complete Bible conversion successful!'));
      console.log(chalk.dim(`📁 Output: ${this.config.outputDir}`));
      console.log(chalk.dim(`📊 ${BIBLE_BOOKS.length} books, ${totalChapters} chapters processed`));
      console.log(chalk.dim(`⏱️  Total time: ${(duration / 1000 / 60).toFixed(1)} minutes`));
      
    } catch (error) {
      logger.failSpinner('Conversion failed');
      throw error;
    }
  }

  private async processChaptersInParallel(
    chapters: ParsedChapter[], 
    _bookName: string
  ): Promise<ParsedChapter[]> {
    const speedMode = this.config.speedMode || 'balanced';
    const CHAPTER_CONCURRENCY = speedMode === 'fast' ? 50 : 20; // Very aggressive in fast mode
    const results: ParsedChapter[] = [];
    
    // Create batches of chapters
    const chapterBatches = [];
    for (let i = 0; i < chapters.length; i += CHAPTER_CONCURRENCY) {
      chapterBatches.push(chapters.slice(i, i + CHAPTER_CONCURRENCY));
    }
    
    // Process each batch
    for (const chapterBatch of chapterBatches) {
      const chapterPromises = chapterBatch.map(async (chapter) => {
        // Fetch footnotes in parallel if needed (skip in fast mode for speed)
        let footnotes: any[] = [];
        
        const skipFootnotes = this.config.speedMode === 'fast';
        
        if (this.config.style === 'study' && this.config.version === 'NET' && !skipFootnotes) {
          try {
            const footnotesHtml = await bibleApi.fetchFootnotes(
              chapter.book, 
              chapter.chapter, 
              this.config.version
            );
            footnotes = this.footnotesParser.parseFootnotes(footnotesHtml);
          } catch (error) {
            // Silently continue without footnotes on error
          }
        }
        
        // Generate markdown
        const markdown = this.markdownGenerator.generateChapterMarkdown(chapter, footnotes);
        
        // Write file
        await this.fileWriter.writeChapter(chapter, markdown);
        
        return chapter;
      });
      
      // Wait for this batch to complete
      const batchResults = await Promise.all(chapterPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
}

export function createConverter(config: SetupConfig): BibleConverter {
  return new BibleConverter(config);
}