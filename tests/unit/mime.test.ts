import { describe, expect, it } from 'vitest';
import {
	contentTypeFromBuffer,
	ensureFileExtension,
	resolveContentType,
} from '../../src/utils/mime';

describe('contentTypeFromBuffer', () => {
	it('detects png magic bytes', () => {
		const buf = new Uint8Array([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]).buffer;
		expect(contentTypeFromBuffer(buf)).toBe('image/png');
	});
});

describe('ensureFileExtension', () => {
	it('appends extension when basename has none', () => {
		expect(ensureFileExtension('Screenshot', 'image/png')).toBe(
			'Screenshot.png',
		);
	});

	it('keeps name when extension is already known', () => {
		expect(ensureFileExtension('photo.jpg', 'image/jpeg')).toBe('photo.jpg');
	});
});

describe('resolveContentType', () => {
	it('sniffs buffer when path has no extension', () => {
		const buf = new Uint8Array([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]).buffer;
		expect(resolveContentType('Screenshot', buf)).toBe('image/png');
	});
});
