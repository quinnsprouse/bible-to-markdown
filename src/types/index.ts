export interface SetupConfig {
  version: BibleVersion;
  style: OutputStyle;
  outputDir: string;
  speedMode?: 'fast' | 'balanced';
}

export type BibleVersion = 'NET' | 'NASB';

export type OutputStyle = 'study' | 'simple' | 'manual';

export interface BibleVersionInfo {
  code: BibleVersion;
  name: string;
  description: string;
}

export interface StyleInfo {
  code: OutputStyle;
  name: string;
  description: string;
}

export interface ConversionOptions {
  version: BibleVersion;
  style: OutputStyle;
  outputDir: string;
  books?: string[];
  force?: boolean;
  concurrent?: number;
}

export interface ApiResponse {
  bible1: string;
  bible2: string;
}

export interface ParsedVerse {
  number: number;
  text: string;
  id: string;
  footnotes?: ParsedFootnote[];
  footnoteNumbers?: number[];
}

export interface ParsedFootnote {
  id: string;
  number: number;
  type: string; // 'tn', 'tc', 'sn', etc.
  content: string;
  verseReferences: VerseReference[];
}

export interface ParsedChapter {
  book: string;
  chapter: number;
  title?: string;
  sections: ParsedSection[];
}

export interface ParsedSection {
  title?: string;
  verses: ParsedVerse[];
}

export interface BibleBook {
  name: string;
  chapters: number;
  testament: 'Old' | 'New';
}

export interface VerseReference {
  book: string;
  chapter: number;
  verse?: number;
  endVerse?: number;
  display: string; // Original text display
}