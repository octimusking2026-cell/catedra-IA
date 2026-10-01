import { describe, it, expect } from 'vitest';
import { validateMediaPayload, validatePdfPayload } from '../server/middleware/mediaValidation';

describe('Media/Upload Payload Validations and Limits', () => {
  it('should reject files exceeding the maximum file limit', () => {
    // Generate a cleanBase64 string representing slightly more than 10MB
    // base64 size for 10MB is roughly 13.3 million chars. Let's create a huge string of 'A's.
    const exceedLimitChars = 'A'.repeat(15 * 1024 * 1024);
    const result = validateMediaPayload(exceedLimitChars, 'image/jpeg');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('supera el límite');
  });

  it('should reject unallowed mime types such as text/plain or image/tiff', () => {
    const fakeBase64 = Buffer.from('fake plain text').toString('base64');
    const resultText = validateMediaPayload(fakeBase64, 'text/plain');
    const resultTiff = validateMediaPayload(fakeBase64, 'image/tiff');

    expect(resultText.valid).toBe(false);
    expect(resultTiff.valid).toBe(false);
    expect(resultText.error).toContain('Solo se admiten');
  });

  it('should reject PDF documents exceeding maximum page limits', () => {
    // A PDF with more than 5 pages. Each '/Type /Page' match increases the page count.
    const content = '%PDF-1.4\n' + '/Type /Page\n'.repeat(6);
    const exceedPdfBase64 = Buffer.from(content).toString('base64');

    const result = validatePdfPayload(exceedPdfBase64);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('máximo permitido por ejercicio');
  });

  it('should accept valid PDF documents within maximum page limits', () => {
    const content = '%PDF-1.4\n' + '/Type /Page\n'.repeat(3);
    const validPdfBase64 = Buffer.from(content).toString('base64');

    const result = validatePdfPayload(validPdfBase64);

    expect(result.valid).toBe(true);
  });
});
