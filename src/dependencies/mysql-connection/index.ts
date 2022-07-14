import { CONFIG } from '../../config';
import { ServerError } from '../../error';
import * as randStr from 'uuid';
import * as mysql from 'mysql2/promise';
import * as _ from 'lodash';
import { DBCondiciones, DBData } from '../../models/database.models';

export var queryCount = 0;

export class Conexion {
	db: mysql.Pool;
	dbData: DBData;


	constructor(dbData?: DBData) {
		this.dbData = {
			connectionLimit: 20,
			host: CONFIG['db']['server'],
			user: CONFIG['db']['user'],
			password: CONFIG['db']['password'],
			database: CONFIG['db']['name'],
			namedPlaceholders: true,
			supportBigNumbers: true
		}

		if (typeof dbData !== 'undefined') {
			Object.assign(this.dbData, dbData);
		}
	}

	createPool = async () => {
		this.db = await mysql.createPool(this.dbData);
	}

	end = () => {
		return this.db.end();
	}

	private procesarCondicion(condiciones: DBCondiciones, valores: object) {
		let where: string;
		let arrCondicion: string[] = [];
		if (typeof condiciones == 'object') {
			for (const key in condiciones) {
				const condicion = condiciones[key];
				if (typeof condicion == 'object' && condicion != null) {
					if (typeof condicion['valor'] == 'object') {
						let list = [];
						switch (condicion['operador']) {
							case "IN":
								for (var i in condicion['valor']) {
									let rand = 'c' + randStr.v4().slice(0, 8); //Magia, no pregunten
									valores[rand] = condicion['valor'][i];
									list.push(`:${rand}`)
								}

								arrCondicion.push(`${key} ${condicion['operador']} (${list.join(',')})`);
								break;

							case "BETWEEN":
								for (var i in condicion['valor']) {
									let rand = 'c' + randStr.v4().slice(0, 8); //Magia, no pregunten
									valores[rand] = condicion['valor'][i];
									list.push(`:${rand}`)
								}

								arrCondicion.push(`${key} ${condicion['operador']} ${list.join(' AND ')}`);

								break;

							default:
								break;
						}
					} else if (condicion['valor'] !== undefined) {
						let rand = 'c' + randStr.v4().slice(0, 3); //Magia, no pregunten
						arrCondicion.push(`${key} ${condicion['operador']} :${rand}`);
						valores[rand] = condicion['valor'];

					}
				} else if (typeof condicion !== 'undefined') {
					let rand = 'c' + randStr.v4().slice(0, 3); //Magia, no pregunten
					arrCondicion.push(`${key} = :${rand}`);
					valores[rand] = condicion;
				}
			}
		}
		return arrCondicion.length ? arrCondicion.join(' AND ') : '1';
	}

	siguienteFila = async (tabla: string, id: number, campos?: string[], condiciones?: DBCondiciones) => {
		let select = '*';
		if (typeof campos !== 'undefined') {
			select = campos.join(',');
		}
		let valores = {};

		condiciones['id'] = { valor: id, operador: '>' }

		let where = this.procesarCondicion(condiciones, valores);

		let sql = `SELECT ${select} FROM ${tabla} WHERE id = (SELECT MIN(id) FROM ${tabla} WHERE ${where})`;
		return this.ejecutarQueryPreparado(sql, valores).then(filas => filas[0]);
	}
	/**
	* Regresa array con todos los nombre de los campos tiene la tabla especificada 
	*
	* @param      string tabla        			tabla en la cual buscar
	*
	*/
	campos = async (tabla: string) => {
		let sql = `SELECT COLUMN_NAME as campo
		FROM INFORMATION_SCHEMA.COLUMNS
		WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tabla;`;

		return await this.ejecutarQueryPreparado(sql, { tabla: tabla, db: this.dbData['database'] }).then((campos: mysql.RowDataPacket[]) => {
			return campos.map(campo => campo['campo']);
		})
	}

	contar = (tabla: string, condiciones?: DBCondiciones) => { }

	/**
	* Regresa true si existe un registro que cumpla con las condiciones 
	*
	* @param      string tabla        			Tabla en la cual buscar
	* @param      DBCondiciones	condiciones  	Condiciones del registro
	*
	*/
	existe = async (tabla: string, condiciones?: DBCondiciones) => {
		let valores = {};
		let where = this.procesarCondicion(condiciones, valores);
		let sql = `SELECT EXISTS(SELECT 1 FROM ${tabla} WHERE ${where}) as existe`;
		return await this.ejecutarQueryPreparado(sql, valores).then(res => {
			return !!res[0].existe;
		});
	}

	/**
	* Inserta registros en la tabla especificada
	*
	* @param      string		tabla     		Tabla en la cual buscar
	* @param      object[]		valores   		valores del registro a crear
	* @param      boolean=false	actualizar   	Si actualiza cuando encuentra registro repetido
	* 
	*/
	insertar = async (tabla: string, valores: object[], actualizar: boolean = false) => {
		let value: object = {};
		let placeholderRegistros: string[] = [];
		let placeholderStr: string;
		let camposStr: string;

		for (var i in valores) {
			let campos: string[] = [];
			let placeholder: string[] = [];
			for (var key in valores[i]) {
				const rand = 'c' + randStr.v4().slice(0, 8);
				campos.push(key);
				placeholder.push(`:${rand}`);
				value[rand] = valores[i][key];
			}
			camposStr = "(" + campos.join(',') + ")";
			placeholderRegistros.push("(" + placeholder.join(',') + ")");
		}
		placeholderStr = placeholderRegistros.join(',');

		let sql = `INSERT INTO ${tabla} ${camposStr} VALUES ${placeholderStr}`;

		if (actualizar) {
			// await this.campos(tabla).then(campos => {
			// campos.shift();
			let camposArr = [];
			for (let key in valores[0]) {
				camposArr.push(` \`${key}\`=VALUES(\`${key}\`)`);
			}
			sql += ` ON DUPLICATE KEY UPDATE${camposArr.join(',')}`;
			// });
		}
		return this.ejecutarQueryPreparado(sql, value);
	}

	/**
	* Lee los campos de los registros que cumplan con las condiciones dadas
	*
	* @param      string		tabla     		Tabla en la cual buscar
	* @param      array   		campos       	Campos a retornar
	* @param      DBCondiciones	condiciones  	Condiciones de los registros 
	* 
	*/
	leer = async (tabla: string, campos?: string[], condiciones?: DBCondiciones, join?: object, group?: string) => {
		let select = '*';
		let valores = {};
		let where = this.procesarCondicion(condiciones, valores);

		if (typeof campos !== 'undefined') {
			select = campos.join(',');
		}
		if (typeof group === 'undefined') {
			group = '';
		}

		if (typeof join !== 'undefined') {

		}

		let sql = `SELECT ${select} FROM ${tabla} WHERE ${where} ${group}`;
		return this.ejecutarQueryPreparado(sql, valores);
	}

	/**
	* Actualiza los registros que cumplan las condiciones con los valores dados
	*
	* @param      string		tabla     		Tabla en la cual buscar
	* @param      object[]		valores   		valores del registro a crear
	* @param      boolean=false	actualizar   	Si actualiza cuando encuentra registro repetido
	* 
	*/
	actualizar = (tabla: string, valores: object, condiciones?: DBCondiciones) => {
		let set: string[] = [];
		let values: object = {};

		_.each(valores, (valor, campo) => {
			const rand = 'c' + randStr.v4().slice(0, 8); //Magia, no pregunten
			set.push(`${campo}=:${rand}`);
			values[rand] = valor;
		});

		let where = this.procesarCondicion(condiciones, values);

		let sql = `UPDATE ${tabla} SET ${set} WHERE ${where}`;
		return this.ejecutarQueryPreparado(sql, values);
	}

	eliminar = (tabla: string, condiciones: DBCondiciones) => {
		let valores = {};
		let where = this.procesarCondicion(condiciones, valores);
		let sql = `DELETE FROM ${tabla} WHERE ${where}`;
		return this.ejecutarQueryPreparado(sql, valores);
	}

	simQuery = (sql, value) => {

		_.each(value, (val, key) => {
			let regex = new RegExp(`:${key}`, 'g')
			sql = sql.replace(regex, val);
		})

		return sql.replace(/[ \t\s]+/g, ' ');
	}

	/**
	* 
	* Ejecuta un query preparado
	* 
	*/
	ejecutarQueryPreparado = async (sql: string, valores: object, ordered?: boolean) => {
		if (CONFIG['debug']) {
			console.log(this.simQuery(sql, valores));
			queryCount++;
		}

		try {
			if (Object.values(valores).indexOf(undefined) > -1) throw new ServerError("undefined_value", 500)
			const [res, fields] = await this.db.execute(sql, valores);
			return res;
		} catch (err) {
			if (CONFIG['debug']) {
				console.log('[ERR]', err);
				console.log('[SQL]', sql);
				console.log('[VALORES]', valores);
			}
			throw new ServerError("database_error", 500);
		}
	}
}
