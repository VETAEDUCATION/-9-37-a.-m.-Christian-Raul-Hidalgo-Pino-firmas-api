import { CONFIG } from './config';
import { Services } from './dependencies';
import { CONN } from './instances';

import { ServerError } from './error';
import * as arg from 'arg';
import * as cors from 'cors';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as multer from 'multer';
import * as fs from 'fs';
import * as uuid from 'uuid';


import { routes } from './routes';
import { Route } from './models/route.models';

const args = arg({
	'--port': Number,
	'-p': '--port',
});

if (args['--port'] !== undefined) {
	CONFIG['puerto'] = args['--port'];
}

const app = express();
const puerto = CONFIG['puerto'];
const dominio = CONFIG['dominio'];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.options('*', cors());

app.use(function (req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	next();
});

app.use('/files', express.static('files'));

//registerRoutesInput(router);
var upload = multer({ dest: `${CONFIG['root']}/temp/` });

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
	if (err instanceof ServerError) {
		const errorDomain: ServerError = err as ServerError;
		res.status(errorDomain.codigo).send({
			message: errorDomain.message,
			status: errorDomain.codigo,
		});
	}
	next(err);
});

app.post('/fileupload', upload.single('fileKey'), async (req, res) => {
	let file = req['file'];
	console.log(file);

	let datos = {};

	if (!fs.existsSync) {
		datos['success'] = false;
		datos['error'] = 'file_not_exists';
		res.send(datos);
		return;
	}
	const filePath = `${CONFIG['root']}/files/${file.originalname}`;
	fs.copyFileSync(file.path, filePath);

	const id = file.originalname.split(' ')[0];

	let contract = (await CONN.leer('contract', undefined, { id: id }))[0];
	// console.log(id, contract);

	let signPathArr = [];

	if (contract.signature_path)
		signPathArr = JSON.parse(contract.signature_path);

	const signIdx = file.originalname.split(' ')[1].split('.')[0];

	signPathArr[signIdx] = filePath;

	if (file.originalname.indexOf(' company.jpg') < 0) {

		CONN.insertar('contract', [{
			...contract,
			signature_path: JSON.stringify(signPathArr),
			date_modified: new Date()
		}], true);

	} else {

		CONN.insertar('contract', [{
			...contract,
			signature_company_path: filePath,
			date_modified: new Date()
		}], true)

	}


	datos['success'] = true;
	res.send(datos);


});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
	if (err instanceof ServerError) {
		const errorDomain: ServerError = err as ServerError;
		res.status(errorDomain.codigo).send({
			message: errorDomain.message,
			status: errorDomain.codigo,
		});
	}
	next(err);
});


routes.forEach((route: Route) => {

	app[route.method.toLowerCase()](route.route, async (req, res) => {
		let datos = {};
		let parametros = Services.getRequest(req, route.method);
		let time = +new Date();
		const userId = req.idUser;
		const json = req.body;

		console.time(route.route + time);

		Services.execute(parametros, req, route)
			.then((respuesta) => {
				console.timeEnd(route.route + time);
				datos['data'] = respuesta;
				datos['success'] = true;
				res.send(datos);
			})
			.catch((err) => {
				console.timeEnd(route.route + time);
				datos['success'] = false;
				datos['message'] = err.message;
				if (CONFIG['debug']) {
					datos['stacktrace'] = err.stack;
				}

				if (err instanceof ServerError) {
					datos['code'] = err.codigo;
				}
				if (CONFIG['debug']) {
					console.log(datos);
				}

				res.status(err.codigo).send(datos);
			});
	});
});

CONN.createPool()
	.then(() => {
		app.listen(puerto, () => {
			console.log(`Servidor publicado en: [${dominio}:${puerto}]`);
		});
	})
	.catch((err) => {
		console.log(
			{
				respuesta: 'No hay conexion con la base de datos',
				estado: 'ERROR',
				codigo: 500,
			},
			err
		);
	});
