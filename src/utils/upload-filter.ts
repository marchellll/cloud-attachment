import type { CloudAttachmentSettings } from '../settings';

export interface FilterResult {
	allowed: boolean;
	reason?: string;
}

export function shouldUploadFile(
	path: string,
	size: number,
	settings: CloudAttachmentSettings,
	gitignored: boolean,
): FilterResult {
	if (settings.respectGitignore && gitignored) {
		return { allowed: false, reason: 'Matched .gitignore' };
	}
	const basename = path.split('/').pop() ?? path;
	if (settings.filenameWhitelistRegex) {
		try {
			const re = new RegExp(settings.filenameWhitelistRegex, 'i');
			if (!re.test(basename)) {
				return { allowed: false, reason: 'Whitelist regex mismatch' };
			}
		} catch {
			return { allowed: false, reason: 'Invalid whitelist regex' };
		}
	}
	if (settings.filenameBlacklistRegex) {
		try {
			const re = new RegExp(settings.filenameBlacklistRegex, 'i');
			if (re.test(basename)) {
				return { allowed: false, reason: 'Blacklist regex match' };
			}
		} catch {
			return { allowed: false, reason: 'Invalid blacklist regex' };
		}
	}
	if (size > settings.maxFileSizeBytes) {
		return { allowed: false, reason: 'Exceeds max file size' };
	}
	return { allowed: true };
}
