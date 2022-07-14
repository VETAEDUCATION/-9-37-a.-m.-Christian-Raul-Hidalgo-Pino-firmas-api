import { LANG, CONFIG } from './../../config';
import * as _ from 'lodash';
import * as hash from 'object-hash';
import { createTreePath } from '../../dependencies/utils'
import * as Utils from '../utils';

import * as fs from 'fs';

export var data: object = {};
export var memoryUsage: number = 0;



function cleanCache(clientId: number, lang: number, component: string): void {
	let fids = Object.keys(data[clientId][lang][component]);
	if (memoryUsage > CONFIG['max_range_cache_memory'] && fids.length > 1) {
		let oldest_fid = fids[0];
		let ptr = data[clientId][lang][component][oldest_fid];

		for (let i = 0; i < fids.length; i++) {
			if (ptr['last_used'] > data[clientId][lang][component][fids[i]]) {
				oldest_fid = fids[i];
				ptr = data[clientId][lang][component][oldest_fid];
			}
		}

		delete data[clientId][lang][component][oldest_fid];
		memoryUsage = Buffer.byteLength(JSON.stringify(data));
		cleanCache(clientId, lang, component);
	}
	console.log(`Memory: ${Utils.formatBytes(memoryUsage)}/${Utils.formatBytes(CONFIG['max_range_cache_memory'])}`);
}

export function get<T>(request, filter, component: string, id?: number): T {
	let session = request.session.user;
	let lang = LANG[session.language];
	let clientId: number = session.id_client;
	let filterid = hash(JSON.stringify(filter));
	fs.appendFileSync('./cachelog', `[GET]\t${new Date()}\t${filterid}\t${JSON.stringify(filter)}\t${JSON.stringify(request.session.user)}\n`);

	data[clientId][lang][component][filterid]['last_used'] = +new Date();
	if (typeof id == 'undefined') {
		let res = { ...data[clientId][lang][component][filterid] }

		delete res['filter'];
		delete res['created'];
		delete res['last_used'];
		delete res['undefined'];
		return res
	}
	return data[clientId][lang][component][filterid][id];
}

export function set(request, filter, component: string, items: any[] | object): void {
	let session = request.session.user;
	let lang = LANG[session.language];
	let clientId: number = session.id_client;
	let filterid = hash(JSON.stringify(filter));

	fs.appendFileSync('./cachelog', `[SET]\t${new Date()}\t${filterid}\t${JSON.stringify(filter)}\t${JSON.stringify(request.session.user)}\n`);

	createTreePath(data, [clientId, lang, component, filterid]);
	if (Array.isArray(items)) {
		cleanCache(clientId, lang, component);
		_.each(items, (item) => {
			data[clientId][lang][component][filterid][item.id] = item;
		})
	} else {
		data[clientId][lang][component][filterid][items['id']] = items;
	}
	data[clientId][lang][component][filterid]['created'] = new Date();
	data[clientId][lang][component][filterid]['filter'] = filter;
	memoryUsage = Buffer.byteLength(JSON.stringify(data));
}

export function validate(request, filter, component): boolean {
	let session = request.session.user;
	let lang = LANG[session.language];
	let clientId: number = session.id_client;
	return Utils.validatePath(data, [clientId + '', lang + '', component, hash(JSON.stringify(filter))]);
}

export async function clear(request, component): Promise<void> {
	let clientId: number = request.session.user.id_client;
	_.each(LANG, (lang, key) => {
		createTreePath(data, [clientId, lang, component]);
		delete data[clientId][lang][component];
	})
}

export async function use(request, filter, component): Promise<void> {
	if (validate(request, filter, component)) return new Promise((res, rej) => res());

	await import('./../../components').then(componentsClass => {
		let promises: Promise<any>[] = [];

		_.each(_.at(componentsClass, [component]), (componentClass) => {
			let c: { _get: CallableFunction } = new componentClass();

			promises.push(c._get({ filter: filter }, request));
		})
		return Promise.all(promises).then(responses => {
			_.each(responses, async (response, idx) => {
				set(request, filter, component, response['data']);
			})
		})
	}).catch(err => {
		if (CONFIG['debug']) console.log(err);
		throw ('caching_error')
	})
}