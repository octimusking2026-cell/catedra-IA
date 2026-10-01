import { describe, it, expect } from 'vitest';
import { parseBase64Media, validatePdfPayload, validateMediaPayload } from '../server/middleware/mediaValidation';

describe('parseBase64Media', () => {
  it('should return null for empty or invalid input', () => {
    expect(parseBase64Media('')).toBeNull();
    expect(parseBase64Media(null as any)).toBeNull();
  });

  it('should parse data URL and extract mimeType and base64 payload', () => {
    const raw = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = parseBase64Media(raw);
    expect(result).not.toBeNull();
    expect(result?.mimeType).toBe('image/png');
    expect(result?.cleanBase64).toContain('iVBORw0KGgo');
  });

  it('should detect PNG from magic bytes in raw base64', () => {
    const result = parseBase64Media('iVBORw0KGgoAAAANSUhEUgAAAA==');
    expect(result?.mimeType).toBe('image/png');
  });

  it('should detect JPEG from magic bytes in raw base64', () => {
    const result = parseBase64Media('/9j/4AAQSkZJRgABAQEASABIAAD/');
    expect(result?.mimeType).toBe('image/jpeg');
  });

  it('should detect PDF from magic bytes in raw base64', () => {
    const result = parseBase64Media('JVBERi0xLjQKJeLjz9MK');
    expect(result?.mimeType).toBe('application/pdf');
  });

  it('should detect WebP from magic bytes in raw base64', () => {
    const result = parseBase64Media('UklGRiQAAABXRUJQVlA4');
    expect(result?.mimeType).toBe('image/webp');
  });

  it('should normalize image/jpg to image/jpeg', () => {
    const result = parseBase64Media('data:image/jpg;base64,ABCDEF123456');
    expect(result?.mimeType).toBe('image/jpeg');
  });

  it('should strip whitespace and newlines from base64 content', () => {
    const raw = 'data:image/jpeg;base64, /9j/ \n 4AAQ \r\n SkZJ ';
    const result = parseBase64Media(raw);
    expect(result?.cleanBase64).toBe('/9j/4AAQSkZJ');
  });
});

describe('validatePdfPayload', () => {
  it('should validate small PDF payload without error', () => {
    const smallPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n').toString('base64');
    const result = validatePdfPayload(smallPdf);
    expect(result.valid).toBe(true);
  });
});

describe('validateMediaPayload', () => {
  it('should validate allowed image mime types', () => {
    const fakeBase64 = Buffer.from('fake image content').toString('base64');
    expect(validateMediaPayload(fakeBase64, 'image/jpeg').valid).toBe(true);
    expect(validateMediaPayload(fakeBase64, 'image/png').valid).toBe(true);
    expect(validateMediaPayload(fakeBase64, 'image/webp').valid).toBe(true);
  });

  it('should reject unallowed mime types', () => {
    const fakeBase64 = Buffer.from('fake content').toString('base64');
    const result = validateMediaPayload(fakeBase64, 'image/gif');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Solo se admiten');
  });
});
