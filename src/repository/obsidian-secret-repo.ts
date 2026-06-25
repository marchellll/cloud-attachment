import type { App } from 'obsidian';
import type { ISecretRepo } from '../types';

const ACCESS_KEY_ID = 'cloud-attachment-access-key-id';
const SECRET_ACCESS_KEY = 'cloud-attachment-secret-access-key';

export class ObsidianSecretRepo implements ISecretRepo {
	private accessKeyId = '';
	private secretAccessKey = '';
	private loaded = false;

	constructor(private app: App) {}

	async load(): Promise<void> {
		if (this.loaded) return;
		this.accessKeyId = this.app.secretStorage.getSecret(ACCESS_KEY_ID) ?? '';
		this.secretAccessKey =
			this.app.secretStorage.getSecret(SECRET_ACCESS_KEY) ?? '';
		this.loaded = true;
	}

	getAccessKeyIdSync(): string {
		return this.accessKeyId;
	}

	getSecretAccessKeySync(): string {
		return this.secretAccessKey;
	}

	async getAccessKeyId(): Promise<string> {
		await this.load();
		return this.accessKeyId;
	}

	async getSecretAccessKey(): Promise<string> {
		await this.load();
		return this.secretAccessKey;
	}

	async setAccessKeyId(value: string): Promise<void> {
		await this.load();
		this.accessKeyId = value;
		this.app.secretStorage.setSecret(ACCESS_KEY_ID, value);
	}

	async setSecretAccessKey(value: string): Promise<void> {
		await this.load();
		this.secretAccessKey = value;
		this.app.secretStorage.setSecret(SECRET_ACCESS_KEY, value);
	}

	async hasCredentials(): Promise<boolean> {
		const id = await this.getAccessKeyId();
		const secret = await this.getSecretAccessKey();
		return Boolean(id && secret);
	}
}
