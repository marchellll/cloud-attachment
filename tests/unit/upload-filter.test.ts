import { describe, expect, it } from 'vitest';
import { shouldUploadFile } from '../../src/utils/upload-filter';
import { DEFAULT_SETTINGS } from '../../src/settings';

describe('shouldUploadFile', () => {
	it('allows matching whitelist', () => {
		const r = shouldUploadFile('a/photo.png', 100, DEFAULT_SETTINGS, false);
		expect(r.allowed).toBe(true);
	});

	it('rejects gitignored paths', () => {
		const r = shouldUploadFile('a/photo.png', 100, DEFAULT_SETTINGS, true);
		expect(r.allowed).toBe(false);
	});

	it('rejects oversized files', () => {
		const r = shouldUploadFile(
			'a/photo.png',
			DEFAULT_SETTINGS.maxFileSizeBytes + 1,
			DEFAULT_SETTINGS,
			false,
		);
		expect(r.allowed).toBe(false);
	});
});
