import * as vscode from 'vscode';
import PageListResponse from './PageListResponse';
import PageContent from './PageContent';
import { Setting } from '../Setting/Setting';
import Revision from './Revision';

export default class GrowiAPI {
	private setting: { url: string, token: string; } | undefined;
	constructor(private context: vscode.ExtensionContext, private channel: vscode.OutputChannel) {
		this.getSetting();
	}
	private async getSetting() {
		if (this.setting) {
			return this.setting;
		}
		this.setting = await Setting.getInstance(this.context);
		return this.setting;
	}
	private async fetch<T>(path: string, method: 'GET' | 'POST' | 'PUT', urlParam?: object, body?: object): Promise<T> {
		const { url, token } = await this.getSetting();
		const _url = new URL(url ?? '');
		_url.pathname = `_api/v3/${path}`;
		_url.searchParams.set('access_token', token ?? '');
		if (urlParam) {
			Object.entries(urlParam).forEach(([k, v]) => {
				_url.searchParams.set(k, v);
			});
		}

		const _body = body ? JSON.stringify(body) : undefined;
		this.channel.appendLine("url" + _url.toString());

		const result = await fetch(_url.toString(), {
			method: method,
			body: _body,
			headers: {
				'Content-Type': "application/json",
			}
		});
		if (!result.ok) {
			throw new Error(`Fetch error. ${result.status} ${result.statusText}, url:${_url.toString()} | ${await result.text()}`);
		}
		return await result.json() as T;
	}

	async fetchDocuments() {
		const result = await this.fetch<PageListResponse>(`pages/recent`, 'GET');
		return result.pages;
	}

	async fetchDocumentContent(path: string) {
		this.channel.appendLine('fetchDocumentContent, path:' + path);
		const encodedPath = encodeURI(path);
		const response = await this.fetch<{ page: PageContent; }>(`page`, 'GET', { path: encodedPath });
		return response;
	}
	async savePageContetnt(page: PageContent) {
		const response = await this.fetch<{ page: Omit<PageContent, 'revision'>; revision: Revision; }>('page', 'PUT', undefined, {
			pageId: page._id,
			revisionId: page.revision._id,
			body: page.revision.body,
		});
		this.channel.appendLine('saveDocumentContetnt response:' + JSON.stringify(response));
		return response;
	}
}
