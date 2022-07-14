import { LANG, CONFIG } from './../../config';
import * as _ from 'lodash';

//TODO quitar dependencia de LANG

export var data: { [key: string]: any } = {};



export function get<T>(component: string, id: number): T {
	return data[component][id];
}

export function getAll<T>(component: string): T[] {
	return data[component];
}

export function set(component: string, res: any[]): void {


	if (typeof data == "undefined") {
		data = {};
	}

	data[component] = {};
	_.each(res, (item) => {
		data[component][item.id] = item;
	})
}


export function validate(...components): string[] {
	if (typeof data === 'undefined') return components;

	let newComponents = [];

	for (let i = 0; i < components.length; i++) {
		if (typeof data[components[i]] === 'undefined')
			newComponents.push(components[i]);
	}

	return newComponents;
}

export async function use(request, ...components): Promise<void> {
	components = validate(...components)
	
	if (components.length === 0) return new Promise((res, rej) => res());

	await import('./../../components').then(componentsClasses => {
		let promises: Promise<any>[] = [];
		console.log(componentsClasses,components);

		_.each(_.at(componentsClasses, ...components), (componentsClass) => {
			
			let c: { _get: CallableFunction } = new componentsClass();
			promises.push(c._get({}, request));
		})

		return Promise.all(promises).then(responses => {
			_.each(responses, async (response, idx) => {
				set(components[idx], response['data']);
			})
		})
	}).catch(err => {
		if (CONFIG['debug']) console.log(err);
		throw ('caching_error')
	})
}

export function clear(...components): void {
	_.each(components, component => {
		delete data[component];
	})
}