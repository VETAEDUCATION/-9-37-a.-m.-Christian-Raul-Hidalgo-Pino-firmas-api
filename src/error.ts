export class ServerError extends Error {
	codigo:number;
	constructor(mensaje,codigo) {
		super(mensaje);
		this.codigo=codigo;
	}
}