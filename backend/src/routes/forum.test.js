import { describe, it, expect } from 'vitest';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function validateForumImage(hasImage, imageUrl) {
  if (hasImage || imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return { valid: false, status: 400, message: 'Invalid image: missing or malformed image data.' };
    }

    const mimeMatch = imageUrl.match(/^data:([^;]+);base64,/);
    if (!mimeMatch) {
      return {
        valid: false,
        status: 400,
        message: 'Invalid image format: must be a base64 encoded data URI (e.g., data:image/jpeg;base64,...).',
      };
    }

    const mimeType = mimeMatch[1].toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return {
        valid: false,
        status: 400,
        message: `Unsupported image format: ${mimeType}. Allowed formats are image/jpeg, image/png, image/webp, and image/gif.`,
      };
    }
  }

  return { valid: true };
}

describe('Forum Image Upload Validation', () => {
  it('allows posts without an image', () => {
    expect(validateForumImage(false, undefined).valid).toBe(true);
    expect(validateForumImage(false, null).valid).toBe(true);
  });

  it('allows valid image/jpeg', () => {
    const res = validateForumImage(true, 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...');
    expect(res.valid).toBe(true);
  });

  it('allows valid image/png', () => {
    const res = validateForumImage(true, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...');
    expect(res.valid).toBe(true);
  });

  it('allows valid image/webp', () => {
    const res = validateForumImage(true, 'data:image/webp;base64,UklGRmYAAABXRUJQVlA4...');
    expect(res.valid).toBe(true);
  });

  it('allows valid image/gif', () => {
    const res = validateForumImage(true, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    expect(res.valid).toBe(true);
  });

  it('rejects unsupported image formats such as svg or pdf', () => {
    const resSvg = validateForumImage(true, 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=');
    expect(resSvg.valid).toBe(false);
    expect(resSvg.status).toBe(400);

    const resPdf = validateForumImage(true, 'data:application/pdf;base64,JVBERi0xLjQK...');
    expect(resPdf.valid).toBe(false);
    expect(resPdf.status).toBe(400);
  });

  it('rejects raw URLs and invalid base64 headers', () => {
    const resRaw = validateForumImage(true, 'https://evil.com/malicious.exe');
    expect(resRaw.valid).toBe(false);
    expect(resRaw.status).toBe(400);

    const resMissing = validateForumImage(true, '');
    expect(resMissing.valid).toBe(false);
    expect(resMissing.status).toBe(400);
  });
});
