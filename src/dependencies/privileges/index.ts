import { createTreePath } from '../utils';
import * as CACHE from '../cache';
import * as _ from 'lodash';



export class Privileges {
	static validate = async (request, component: string, action: string, params: any): Promise<boolean> => {
		let session = request.session;

		await CACHE.use(request, 'PrivilegesComponent')

		let roles = [{ id: 0, name: 'No logueado' }];
		if (typeof session.user !== 'undefined') {
			roles = session.user.roles
		}

		let permisosArr: any[] = Object.values(CACHE.getAll('PrivilegesComponent'));

		let permisos = permisosArr.reduce((obj, el) => {
			createTreePath(obj, [el['component'].trim(), el['action'].trim()]);
			obj[el['component'].trim()][el['action'].trim()] = el['privilege']
			return obj;
		}, {})
		console.log(component,action,permisos);

		if (typeof permisos[component] !== 'object') return false;
		if (typeof permisos[component][action] !== 'number') return false;
		
		return _.some(roles, role => !!+(permisos[component][action] >> (role.id)).toString(2).slice(-1));
	}
}