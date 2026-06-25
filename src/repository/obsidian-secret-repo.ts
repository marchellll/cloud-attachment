import type { App } from 'obsidian';
import type { ISecretRepo } from '../types';

const ACCESS_KEY_ID = 'cloud-attachment/accessKeyId';
const SECRET_ACCESS_KEY = 'cloud-attachment/secretAccessKey';

export class ObsidianSecretRepo implements ISecretRepo {
	constructor(private app: App) {}

	async getAccessKeyId(): Promise<string> {
		return this.app.secretStorage.getSecret(ACCESS_KEY_ID) ?? '';
	}

	async getSecretAccessKey(): Promise<string> {
		return this.app.secretStorage.getSecret(SECRET_ACCESS_KEY) ?? '';
	}

	async setAccessKeyId(value: string): Promise<void> {
		this.app.secretStorage.setSecret(ACCESS_KEY_ID, value);
	}

	async setSecretAccessKey(value: string): Promise<void> {
		this.app.secretStorage.setSecret(SECRET_ACCESS_KEY, value);
	}

	async hasCredentials(): Promise<boolean> {
		const id = await this.getAccessKeyId();
		const secret = await this.getSecretAccessKey();
		return Boolean(id && secret);
	}
}
