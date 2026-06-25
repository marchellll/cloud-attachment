import { describe, expect, it } from 'vitest';
import { sha256Hex } from '../../src/utils/content-hash';

describe('sha256Hex', () => {
	it('hashes empty buffer', async () => {
		const hash = await sha256Hex(new ArrayBuffer(0));
		expect(hash).toHaveLength(64);
	});
});
