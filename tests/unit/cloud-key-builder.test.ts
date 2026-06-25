import { describe, expect, it, vi } from 'vitest';
import { buildCloudKey, buildPublicUrl } from '../../src/utils/cloud-key-builder';

describe('buildCloudKey', () => {
	it('returns sanitized name when rename disabled', () => {
		expect(buildCloudKey('img.png', false)).toBe('img.png');
	});

	it('prefixes date and uuid when rename enabled', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-24T12:00:00Z'));
		const key = buildCloudKey('img.png', true);
		expect(key).toMatch(/^2026\/06\/24\/.+-img\.png$/);
		vi.useRealTimers();
	});
});

describe('buildPublicUrl', () => {
	it('joins base and key', () => {
		expect(buildPublicUrl('https://cdn.example.com/', 'a/b.png')).toBe(
			'https://cdn.example.com/a/b.png',
		);
	});
});
