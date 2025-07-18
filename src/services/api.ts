import axios, { AxiosInstance } from 'axios';
import { BibleVersion, ApiResponse } from '../types/index.js';

export class BibleApiService {
  private client: AxiosInstance;
  private textBaseUrl = 'https://netbible.org/resource/netTexts';
  private notesBaseUrl = 'https://netbible.org/resource/netNotes';

  constructor() {
    this.client = axios.create({
      timeout: 15000, // Increased timeout for batch requests
      headers: {
        'User-Agent': 'bible2md/1.0.0',
        'Connection': 'keep-alive'
      },
      // Connection pooling for better performance
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });
  }

  async fetchChapters(
    book: string,
    chapters: number[],
    version: BibleVersion = 'NET'
  ): Promise<ApiResponse> {
    const chapterParam = chapters.map(ch => `${book}%20${ch}`).join(';');
    const bible1Translation = version === 'NET' ? 'net_strongs2' : 'nasb';
    const bible2Translation = version === 'NET' ? 'nasb' : 'net_strongs2';
    
    const url = `${this.textBaseUrl}/${chapterParam}?bible1Translation=${bible1Translation}&bible2Translation=${bible2Translation}`;
    
    try {
      const response = await this.client.get<ApiResponse>(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  async fetchFootnotes(
    book: string,
    chapter: number,
    version: BibleVersion = 'NET'
  ): Promise<string> {
    if (version !== 'NET') {
      return ''; // Footnotes only available for NET version
    }
    
    const url = `${this.notesBaseUrl}/${book}%20${chapter}?bible1Translation=net_strongs2`;
    
    try {
      const response = await this.client.get<string>(url);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Footnotes API request failed: ${error.message}`);
      }
      throw error;
    }
  }

  async fetchSingleChapter(
    book: string,
    chapter: number,
    version: BibleVersion = 'NET'
  ): Promise<ApiResponse> {
    return this.fetchChapters(book, [chapter], version);
  }

  async fetchBookChapters(
    book: string,
    totalChapters: number,
    version: BibleVersion = 'NET',
    batchSize: number = 20
  ): Promise<ApiResponse[]> {
    // Create all batch requests concurrently for better performance
    const batchPromises: Promise<ApiResponse>[] = [];
    
    for (let i = 1; i <= totalChapters; i += batchSize) {
      const chapterBatch = Array.from(
        { length: Math.min(batchSize, totalChapters - i + 1) },
        (_, idx) => i + idx
      );
      
      batchPromises.push(this.fetchChapters(book, chapterBatch, version));
    }
    
    // Execute all batches concurrently
    return Promise.all(batchPromises);
  }
}

export const bibleApi = new BibleApiService();