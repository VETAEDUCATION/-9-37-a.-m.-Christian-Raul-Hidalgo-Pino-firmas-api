import { ServerError } from '../../error';
import { CONFIG } from '../../config';
import { ReadStream } from 'fs';

import * as formData from 'form-data';
import * as http from 'http';
import * as randStr from 'uuid';

export class Communication {
	url: string;
	postOptions: object;
	lastResponse: http.IncomingMessage;
	sessionId;
	appkey: string;

	constructor(url: string, port: number = 80, path: string, appkey: string) {
		this.sessionId = randStr();
		this.url = url;
		this.appkey = appkey;
		this.postOptions = {
			host: url,
			port: port,
			path: path,
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': 0
			}
		};
	}

	upload = (session, file: ReadStream): Promise<any> => {
		return new Promise((resolve, reject) => {

			let form = new formData();
			form.append('fileKey', file);

			let options = Object.assign({}, this.postOptions);
			options['path'] = '/fileupload';
			options['headers'] = form.getHeaders();
			options['method'] = 'POST';


			let req = http.request(options, (res) => {
				let rawResponse: string = '';
				this.lastResponse = res;

				res.on('data', (chunk) => {
					rawResponse += chunk;
				}).on('end', () => {
					let response: object;

					try {
						response = JSON.parse(rawResponse);

						if (response['success']) {
							resolve(response['data']);
						} else {
							if (CONFIG['debug'])
								console.log(response['error']);

							reject(new ServerError(response['error'], response['code']));
						}
					} catch (e) {
						if (CONFIG['debug'])
							console.error(`JSON parse error: ${e.message}`, rawResponse);

						reject(e);
					}
				});

			});
			req.on('error', (e) => {
				if (CONFIG['debug'])
					console.error(`Request error: ${e.message}`);
				reject(e);
			});

			form.pipe(req)
		})
	}

	get = (path): Promise<string> => {
		return new Promise((resolve, reject) => {
			let options = Object.assign({}, this.postOptions);
			options['path'] = path;
			options['method'] = 'GET';

			let request = http.request(options, (res: http.IncomingMessage) => {
				res.on('data', (chunk) => {
					resolve(chunk);
				}).on('error', (e) => {
					if (CONFIG['debug'])
						console.error(`Request error: ${e.message}`);

					reject(e);
				})
			})
			request.end();
		})

	}
	send = (session, component: string, action: string, payload?: object): Promise<any> => {
		let data = Object.assign(typeof payload == 'object' ? payload : {}, { component: component, action: action });

		data['sessid'] = session.id;
		data['key'] = this.appkey ? this.appkey : undefined;
		data['session'] = session.user;

		session.ext = session.ext == undefined ? {} : session.ext;
		let otherOptions = {
			headers: { ...session.headers } ? { ...session.headers, 'Content-length': Buffer.byteLength(JSON.stringify(data)) } : {},
			method: 'POST'
		}
		return new Promise((resolve, reject) => {
			let request = http.request({ ...this.postOptions, ...otherOptions }, (res: http.IncomingMessage) => {
				let rawResponse: string = '';
				this.lastResponse = res;

				res.setEncoding('utf8');

				res.on('data', (chunk) => {
					rawResponse += chunk;

				}).on('error', (e) => {
					if (CONFIG['debug'])
						console.error(`Request error: ${e.message}`);

					reject(e);
				}).on('end', () => {
					let response: object;

					try {
						response = JSON.parse(rawResponse);

						if (response['success']) {
							resolve(response['data']);
						} else {
							if (CONFIG['debug']) {
								console.error(response['error'], `${this.url}:${this.postOptions['port']}`)

							}

							reject(new ServerError(response['error'], response['code']));
						}
					} catch (e) {
						if (CONFIG['debug']) {
							console.error(e.message, `${this.url}:${this.postOptions['port']}`)
							console.error(`JSON parse error: ${e.message}`, rawResponse);
						}

						reject(e);
					}
				});
			})
			request.on('error', (e) => {
				var stack = new Error().stack
				console.error('[API Can\'t Communicate]', e.message, data, this.postOptions, stack);
				reject(e);
			});

			request.write(JSON.stringify(data));

			request.end();

		});
	}
}