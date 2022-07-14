import { Privileges } from '..'
import { ServerError } from '../../error';

import * as QueryString from 'qs';
import { Route } from '../../models/route.models';



export class Services {
	static getRequest = (request, method): object => {
		if (method == 'GET') {
			return QueryString.parse(request.query);
		}
		return request.body;
	}

	static execute = async (parametros: object, request, route: Route) => {
		let instance = new route.component();

		let action = '_' + route.action;

		// if (!(await Privileges.validate(request, instance.constructor.name, route.action, parametros))) {
		// 	throw new ServerError(`not_authorized`, 401);
		// }

		return instance[action](parametros, request);
	}
}