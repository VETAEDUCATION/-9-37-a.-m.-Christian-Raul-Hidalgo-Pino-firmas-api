import * as _ from 'lodash';
import * as uuid from 'uuid';
import { Order } from '../../models/utils.models';

export var normalizeDateRange = (date_range) => {
	return {
		start_date: typeof date_range['start_date'] == 'string' ? (new Date(date_range['start_date'])).toISOString() : date_range['start_date'].toISOString(),
		end_date: typeof date_range['end_date'] == 'string' ? (new Date(date_range['end_date'])).toISOString() : date_range['end_date'].toISOString()
	}
}

export var genid = () => {
	return uuid().slice(0, 8);
}

export var shuffle = (a: any[]): any[] => {
	let j, x, i;
	for (i = a.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		x = a[i];
		a[i] = a[j];
		a[j] = x;
	}
	return a;
}

export var isValidEmail = (str: string) => str.match(/^[a-z\-\.0-9_]+@[a-z\-\.0-9_]+(?:\.[a-z\-\.0-9_]+)+\.?$/i);

export var formatBytes = (bytes, decimals = 2) => {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


/**
 * Verifica si no hay un undefined en la ruta especificada de un arbol 
 * 
 * @param tree arbol a verificar
 * @param path ruta a verificar
 */
export var validatePath = (tree, path: string[]) => {


	if (!path.length) return !!tree;
	let ptr = tree;

	return !path.some(key => {
		ptr = ptr[key]
		return typeof ptr == 'undefined';
	})
}

export var transpose = (items, w) => {
	let aux = [];
	let h = Math.floor(items.length / w);

	for (let i = 0; i < items.length; i++) {
		let x = Math.floor(i / h);
		let y = i % h;

		let î = x + w * y;

		aux[i] = items[î];
	}

	return aux.filter(el => el);
}

export var getTimesBetween = (startDate: string | Date, endDate: string | Date, hourInterval = 1): Date[] => {

	if (typeof startDate == 'string') {
		startDate = new Date(startDate)
		startDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0))
	};
	if (typeof endDate == 'string') endDate = new Date(endDate);
	if (endDate < startDate) return [];

	let dates = [];
	let ptr = startDate;
	while (ptr <= endDate) {
		dates.push(new Date(+ptr));
		ptr.setHours(ptr.getHours() + hourInterval)
	}
	return dates;
}

export var getDaysBetween = (startDate: string | Date, endDate: string | Date, daysinterval = 1): Date[] => {

	if (typeof startDate == 'string') {
		startDate = new Date(startDate)
		startDate = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0))
	};
	if (typeof endDate == 'string') endDate = new Date(endDate);
	if (endDate < startDate) return [];

	let dates = [];
	let ptr = startDate;
	while (ptr <= endDate) {
		dates.push(new Date(+ptr));
		ptr.setDate(ptr.getDate() + daysinterval)
	}
	return dates;
}

export var fillTree = (path: string[]): object => {
	let tree = {};
	let ptr = tree;
	path.forEach((key, idx) => {
		ptr[key] = {}
		ptr = ptr[key];
	})
	return tree;
}


export var createTreePath = (tree: object, path: string[]): void => {
	let key = path[0]
	if (typeof tree[key] !== 'object') {
		tree[key] = fillTree(path.slice(1));
		return;
	}
	createTreePath(tree[key], path.slice(1));
}

export var extractUniqueVal = (obj: { [s: string]: any; }, key: string) => [...new Set(Object.values(obj).map(el => el[key]))]

export var cookie2Object = (cookie: string): object => {
	let output = {};
	cookie.split(/\s*;\s*/).forEach((pair: any) => {
		pair = pair.split(/\s*=\s*/);
		output[pair[0]] = pair.splice(1).join('=');
	});

	return output;
}

export var filterObj = (raw: { [x: string]: any; }, filterFn: (arg0: any) => boolean) => Object.keys(raw)
	.filter(key => filterFn(raw[key]))
	.reduce((obj, key) => {
		obj[key] = raw[key];
		return obj;
	}, {});

export var isPrimitive = (object: any): boolean => typeof object === 'undefined'
	|| typeof object === 'string'
	|| typeof object === 'number'
	|| typeof object === 'boolean'
	|| object instanceof Date;


export var normalize = (str: string): string => str.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export var compare = (a: number | string, b: number | string): number => {

	if (typeof a == "string") a = normalize(a);
	if (typeof b == "string") b = normalize(b);

	if (a > b) return 1;
	if (a == b) return 0;
	if (a < b) return -1;

}


export var order = <T>(res: T[], ord: Order): T[] => {
	if (typeof ord != 'undefined') {
		switch (ord.direction) {
			case "DESC":
				return res.sort((b, a) => compare(a[ord.field], b[ord.field]));
			case "ASC":
			default:
				return res.sort((a, b) => compare(a[ord.field], b[ord.field]));
		}
	}
}

/**
 * Reemplaza todas las ocurrencias en un string 
 * @param str string
 * @param search string
 * @param replace string
 */
export var replaceAll = (str: string, search: string, replace: string): string => str.replace(new RegExp(search, 'g'), replace);

/**
 * Reemplaza tokens rodeados por {{}} por los valores dados en el objeto
 * 'hola {{world}}',{world:'mundo'} -> 'hola mundo'
 * @param str string
 * @param obj object
 */
export var replaceTokens = (str: string, obj: { [x: string]: any; }): string => {
	_.each(obj, (item, key) => {
		str = replaceAll(str, `{{${key}}}`, item);
	})
	return str;
}

/**
 * Extrae las llaves de un objeto que cumplan con un prefijo pre en un nuevo objeto
 * {pre_id:1,pre_name:'hola', llave:23} -> {id:2,name:'hola'}
 * @param obj object
 * @param pre string
 */
export function extractSubobject<T>(obj: object, pre: string): T {

	let Subobj = _.pickBy(obj, (field, name) => name.indexOf(pre) != -1) as unknown;
	Object.keys(Subobj).forEach(key => {
		Subobj[key.replace(pre, '')] = Subobj[key];
		delete Subobj[key];
	});

	return Subobj as T;
}

/**
 * Cambia la primera letra de un string por mayuscula
 * @param s string
 */
export var capitalize = (s: string): string => {
	if (typeof s !== 'string') return ''
	return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Compara de forma redundante varios objetos
 * @param args objects
 */
export function deepCompare(...args): boolean {
	let i, l, leftChain, rightChain;

	function compare2Objects(x, y) {
		let p;

		// remember that NaN === NaN returns false
		// and isNaN(undefined) returns true
		if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
			return true;
		}

		// Compare primitives and functions.     
		// Check if both arguments link to the same object.
		// Especially useful on the step where we compare prototypes
		if (x === y) {
			return true;
		}

		// Works in case when functions are created in constructor.
		// Comparing dates is a common scenario. Another built-ins?
		// We can even handle functions passed across iframes
		if ((typeof x === 'function' && typeof y === 'function') || (x instanceof Date && y instanceof Date) || (x instanceof RegExp && y instanceof RegExp) || (x instanceof String && y instanceof String) || (x instanceof Number && y instanceof Number)) {
			return x.toString() === y.toString();
		}

		// At last checking prototypes as good as we can
		if (!(x instanceof Object && y instanceof Object)) {
			return false;
		}

		if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
			return false;
		}

		if (x.constructor !== y.constructor) {
			return false;
		}

		if (x.prototype !== y.prototype) {
			return false;
		}

		// Check for infinitive linking loops
		if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
			return false;
		}

		// Quick checking of one object being a subset of another.
		// todo: cache the structure of arguments[0] for performance
		for (p in y) {
			if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
				return false;
			}
			else if (typeof y[p] !== typeof x[p]) {
				return false;
			}
		}

		for (p in x) {
			if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
				return false;
			}
			else if (typeof y[p] !== typeof x[p]) {
				return false;
			}

			switch (typeof (x[p])) {
				case 'object':
				case 'function':

					leftChain.push(x);
					rightChain.push(y);

					if (!compare2Objects(x[p], y[p])) {
						return false;
					}

					leftChain.pop();
					rightChain.pop();
					break;

				default:
					if (x[p] !== y[p]) {
						return false;
					}
					break;
			}
		}

		return true;
	}

	if (arguments.length < 1) {
		return true; //Die silently? Don't know how to handle such case, please help...
		// throw "Need two or more arguments to compare";
	}

	l = arguments.length
	for (i = 1; i < l; i++) {

		leftChain = []; //Todo: this can be cached
		rightChain = [];

		if (!compare2Objects(arguments[0], arguments[i])) {
			return false;
		}
	}

	return true;
}
