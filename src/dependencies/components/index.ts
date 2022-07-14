import * as Utils from '../utils';
import * as FilterCache from '../filter-cache';
import * as CACHE from '../cache';
import { LANG } from './../../config';
import * as _ from 'lodash';

import { ComponentResponse, ComplyFunction } from '../../models/utils.models';
import { ServerError } from '../../error';


export class SourceComponent<RawDataType, DataType> {
	component;
	connection;
	queries: { get: string };

	compile: { (items: RawDataType[], request): DataType[] };
	decompile: { (item: DataType): { [table: string]: object[] }[] };

	complyFnFactory: { (filterType: string): ComplyFunction<DataType> };

	_flushRelevants: { (params?: null, request?: null) } = (params?: null, request?: null) => { };

	async _get(params: any, request): Promise<ComponentResponse<DataType>> {
		let lang = LANG[request.session.user.language];
		let clientId: number = request.session.user.id_client;
		let req = request;
		if (params.lang) {
			req = _.cloneDeep(request);
			req.session.user.language = params.lang;
			lang = LANG[params.lang];
		}

		params.filter.date_range = Utils.normalizeDateRange(params.filter.date_range);

		if (!FilterCache.validate(req, { date_range: params.filter.date_range, relevant: params.filter.relevant }, this.component)) {
			await this._flushRelevants();
			let weeks = Utils.getDaysBetween(params.filter['date_range']['start_date'], params.filter['date_range']['end_date'], 15);
			weeks.push(new Date(params.filter['date_range']['end_date']));

			for (let i = 0; i < weeks.length - 1; i++) {
				let sqlParams = {
					client: clientId,
					lang: lang,
					start_date: weeks[i],
					end_date: weeks[i + 1]
				}

				await this.connection.ejecutarQueryPreparado(Utils.replaceTokens(this.queries.get, { relevant: params.filter.relevant ? ' IF(relevant = 1, 1, 0) = 1' : '1' }), sqlParams).then((dataRaw: RawDataType[]) => {
					FilterCache.set(req, { date_range: params.filter.date_range, relevant: params.filter.relevant }, this.component, Object.values<DataType>(this.compile(dataRaw, req)));
				})
			}
		}

		let data = FilterCache.get<DataType[]>(req, { date_range: params.filter.date_range, relevant: params.filter.relevant }, this.component);

		let res: DataType[] = params.filter ? Object.values<DataType>(data).filter(agent => this.complies(agent, params.filter)) : Object.values<DataType>(data);
		let count: number = res.length;
		let total: number = 100;
		let offset: number = 0;

		if (params.pagination) {
			total = params.pagination.items ? params.pagination.items : 100;
			offset = total * (params.pagination.page - 1);
		}

		if (typeof params.order != 'undefined') {
			switch (params.order.direction) {
				case "DESC":
					res.sort((b, a) => Utils.compare(a[params.order.field], b[params.order.field]));
					res = res.slice(offset, offset + total);
					break;
				case "ASC":
				default:
					res.sort((a, b) => Utils.compare(a[params.order.field], b[params.order.field]));
					res = res.slice(offset, offset + total);
					break;
			}
		}

		return {
			count: count,
			data: res
		};

	}

	complies = (item: DataType, filter): boolean => !Object.keys(filter).some(key => !this.complyFnFactory(key)(item, filter[key]))

	_updateCache = (params: void, request) => {
		return FilterCache.clear(request, this.component).then(() => {
			let today = (new Date()).toISOString().split('T')[0];
			let startDate = new Date(today);
			let endDate = new Date(today);

			startDate.setDate(endDate.getDate() - 14);
			startDate.setHours(5, 0, 0);
			endDate.setHours(4, 59, 59);
			endDate.setDate(endDate.getDate() + 1);

			let updateParams = {
				date_range: {
					start_date: startDate.toString(),
					end_date: endDate.toString()
				}
			};

			if (this.component == 'News' || this.component == 'Tweets') {
				updateParams['relevant'] = true;
			}

			return FilterCache.use(request, updateParams, this.component)
		})
	}

}

export class Component<RawDataType, DataType> {
	connection;
	queries: { get: string };

	compile: { (items: RawDataType[], request?): DataType[] } = (items, request) => {
		return items as unknown as DataType[]
	};
	decompile: { (item: DataType, request?): { [table: string]: object[] } | Promise<{ [table: string]: object[] }> };

	async _get(params: any, request) {

		let req = request;
		if (params.lang) {
			req = _.cloneDeep(request);
			req.session.user.language = params.lang;
		}

		if (CACHE.validate(request, this.constructor.name).length) {
			let sqlParams = {};

			await this.connection.ejecutarQueryPreparado(this.queries.get, sqlParams).then((dataRaw: RawDataType[]) => {
				CACHE.set(this.constructor.name, Object.values<DataType>(this.compile(dataRaw, request)));
			});
		}

		let data = CACHE.getAll<DataType>(this.constructor.name);

		let res: DataType[] = params.filter ? Object.values<DataType>(data).filter(agent => this.complies(agent, params.filter)) : Object.values<DataType>(data);
		let count: number = res.length;
		let total: number = 100;
		let offset: number = 0;

		if (params.pagination) {
			total = params.pagination.items ? params.pagination.items : 100;
			offset = total * (params.pagination.page - 1);
		}

		if (typeof params.order != 'undefined') {
			switch (params.order.direction) {
				case "DESC":
					res.sort((b, a) => Utils.compare(a[params.order.field], b[params.order.field]));
					res = res.slice(offset, offset + total);
					break;

				case "ASC":
				default:
					res.sort((a, b) => Utils.compare(a[params.order.field], b[params.order.field]));
					res = res.slice(offset, offset + total);
					break;
			}
		}

		return {
			count: count,
			data: res
		};
	}

	async _set(params: { data: DataType }, request) {

		let registers = await this.decompile(params.data, request);

		let deletePromises = [];
		let base = { id: null, table: null };
		_.each(registers, (register, table) => {
			if (register[0] && register[0].id) {
				base.id = register[0].id;
				base.table = table;
			} else if (base.id && base.table) {
				deletePromises.push([table, { ['id_' + base.table]: base.id }, true]);
			}
		})

		for (let promise of deletePromises) {
			await this.connection.eliminar.apply(this, promise);
		}

		let insertPromises = [];
		_.each(registers, (register, table) => {
			if (register.length) {
				insertPromises.push([table, register]);
			}
		})

		for (let promise of insertPromises) {
			await this.connection.insertar.apply(this, promise);
		}

		return this.setHook(request);

	}

	_updateCache(params: void, request) {
		if (CACHE.data) CACHE.clear(this.constructor.name);

		return CACHE.use(request, this.constructor.name);
	}

	setHook(request) {
		this._updateCache(null, request);
	}

	complies = (item: DataType, filter): boolean => !Object.keys(filter).some(key => !this.complyFnFactory(key)(item, filter[key]))


	complyFnFactory: { (filterType: string): ComplyFunction<DataType> } = (filterType: string): ComplyFunction<DataType> => {
		switch (filterType) {
			case 'id':
				return (data: DataType, value: number): boolean => value ? data[filterType] == value : true;

			case 'name':
			case 'text':
				return (data: DataType, value): boolean => {
					if (Array.isArray(value) && value.length) {
						return value.some(item => {
							return Utils.normalize(data['name']).indexOf(Utils.normalize(item.name)) !== -1
						});
					}
					return Utils.normalize(data['name']).indexOf(Utils.normalize(String(value))) !== -1;
				}

			default:
				throw new ServerError('invalid_filter_type' + filterType, 400);
		}
	}

}

export class Bridge {
	COMM;
	component: String;

	_get(params: any, request) {
		return this.COMM.send(request.session, this.component ? this.component : this.constructor.name, 'get', params);
	}

	_set(params: any, request) {
		return this.COMM.send(request.session, this.component ? this.component : this.constructor.name, 'set', params);
	}

	_count(params: any, request) {
		return this.COMM.send(request.session, this.component ? this.component : this.constructor.name, 'count', params);
	}

	_updateCache(params: any, request) {
		return this.COMM.send(request.session, this.component ? this.component : this.constructor.name, 'updateCache', params);
	}

	_getForm(params: any, request) {
		return this.COMM.send(request.session, this.component ? this.component : this.constructor.name, 'getForm', params);
	}

	_remove = (params: any, request) => {
		return this.COMM.send(request.session, this.component ? this.component : this.constructor.name, 'remove', params);
	}

}

export class Source extends Bridge {

	_flushRelevants(params: any, request) {
		return this.COMM.send(request.session, this.component ? this.component : this.constructor.name, 'flushRelevants', params);
	}

	_getList(params: any, request) {
		return this.COMM.send(request.session, this.component ? this.component : this.constructor.name, 'getList', params);
	}

	_toggleRelevant(params: any, request) {
		return this.COMM.send(request.session, this.component ? this.component : this.constructor.name, 'toggleRelevant', params);
	}

	_totals(params: any, request) {
		return this.COMM.send(request.session, this.component ? this.component : this.constructor.name, 'totals', params);
	}

	_process(params: any, request) {
		return this.COMM.send(request.session, this.constructor.name, 'process', params);
	}
}
