import { describe, expect, it } from 'vitest';
import { LinkService } from '../../src/service/link-service';
import { LogService } from '../../src/service/log-service';
import { FakeLogRepo, FakeVaultRepo } from '../helpers/fake-repos';

describe('LinkService', () => {
	it('rewrites wiki links in notes', async () => {
		const vault = new FakeVaultRepo();
		vault.files.set('attachments/a.png', new ArrayBuffer(8));
		vault.notes.set('note.md', '![[a.png]]');
		const log = new LogService(new FakeLogRepo(), () => ({
			logDebugEnabled: false,
			logRetentionMax: 100,
		} as never));
		const links = new LinkService(vault, log);
		const modified = await links.rewriteLinks(
			'attachments/a.png',
			'https://cdn.example.com/a.png',
		);
		expect(modified).toContain('note.md');
		expect(vault.notes.get('note.md')).toContain('https://cdn.example.com/a.png');
	});
});
