import { describe, expect, it } from 'vitest';
import { libraryQuerySchema, searchQuerySchema } from '@/features/search/schemas/search.schema';

describe('search schemas', () => {
  it('test_search_empty_query_400: rejects empty search query', () => {
    expect(() => searchQuerySchema.parse({ q: '' })).toThrow();
  });

  it('test_search_basic_query: accepts valid search query', () => {
    const parsed = searchQuerySchema.parse({ q: 'english vocab' });
    expect(parsed.q).toBe('english vocab');
  });

  it('test_search_language_filter: accepts language filter', () => {
    const parsed = searchQuerySchema.parse({ q: 'vocab', language: 'en' });
    expect(parsed.language).toBe('en');
  });

  it('test_search_tag_filter: accepts tag filter', () => {
    const parsed = searchQuerySchema.parse({
      q: 'vocab',
      tagId: 'clxyz123456789012345678901',
    });
    expect(parsed.tagId).toBe('clxyz123456789012345678901');
  });

  it('test_library_newest_sort: defaults to newest', () => {
    const parsed = libraryQuerySchema.parse({});
    expect(parsed.sort).toBe('newest');
  });

  it('test_library_trending_sort: accepts trending sort', () => {
    const parsed = libraryQuerySchema.parse({ sort: 'trending' });
    expect(parsed.sort).toBe('trending');
  });

  it('test_library_most_studied_sort: accepts most_studied sort', () => {
    const parsed = libraryQuerySchema.parse({ sort: 'most_studied' });
    expect(parsed.sort).toBe('most_studied');
  });
});
