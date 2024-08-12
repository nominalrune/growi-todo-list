import * as vscode from 'vscode';
import ListItemNode from './ListItemNode';
import GrowiAPI from '../GrowiAPI/GrowiAPI';
import { ListItem, Root } from 'mdast';
import MarkdownService from '../MarkdownService';
import PageContent from '../GrowiAPI/PageContent';
export default class PageContentProvider implements vscode.TreeDataProvider<ListItemNode<ListItem>> {
	private _onDidChangeTreeData = new vscode.EventEmitter<ListItemNode<ListItem> | undefined | void>();
	public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
	public get path() {
		if (!this.page) { return ''; }
		return this.page.path;
	};
	private page: PageContent | undefined;
	private api: GrowiAPI;
	private hasChanged = false;
	#content: Root | undefined;
	private get content() {
		return this.#content;
	}
	private set content(value: Root | undefined) {
		this.#content = value;
		if (this.page && value) {
			this.page.revision.body = this.markdown.stringify(value);
		}
	}
	private markdown: MarkdownService;
	constructor(private context: vscode.ExtensionContext) {
		this.api = new GrowiAPI(this.context);
		this.markdown = new MarkdownService();
		console.log('DocumentContentProvider created', {
			api: this.api,
		});
	}
	dispose() {
		this.saveChanges();
	}

	getTreeItem(element: ListItemNode<ListItem | Root>): vscode.TreeItem {
		return element;
	}

	getChildren(element?: ListItemNode<ListItem | Root>): Thenable<(ListItemNode<ListItem>)[]> {
		// no content set
		if (!this.content) { return Promise.resolve([]); }
		// element is not set - it's root
		if (!element) {
			return Promise.resolve(
				new ListItemNode(`root`, this.content).children
			);
		}
		// element has children (or not)
		return Promise.resolve(element.children ?? []);
	}

	async load(path?: string) {
		console.log('load', path);
		// save changes before loading other document
		if (this.hasChanged) {
			await this.saveChanges();
			this.hasChanged = false;
		}

		path ??= this.path;
		if (!path) { return; }
		const result = await this.api.fetchDocumentContent(path);
		this.page = result.page;
		const body = result.page.revision.body ?? '';

		this.content = this.markdown.parse(body);
		this._onDidChangeTreeData.fire();
		console.log('content', body, 'parsed', this.content);
	}
	public async saveChanges() {
		if (this.hasChanged && !!this.page) {
			console.log('saveChanges started');
			await this.api.savePageContetnt(this.page);
		}
		this.hasChanged = false;
	}
	public toggleCheck(node: ListItemNode<ListItem>) {
		console.log('toggleCheck');
		if (!this.content) { return; }
		const route = node.id.split('-');
		route.shift();
		const checked = node.checkboxState === vscode.TreeItemCheckboxState.Checked ? true : false;
		const toEval = `${route.reduce((acc, path) => `${acc}.children[${path}]`, 'this.content')}.checked = ${checked}`;
		console.log({ content: this.content, toEval });
		eval(toEval);
		this.hasChanged = true;
		// this.content.children = this.content.children
		// .map(n => n.id === node.id ? ({ ...n, checked }) : n);
		console.log('toggleCheck', node, this.content);
	}
}