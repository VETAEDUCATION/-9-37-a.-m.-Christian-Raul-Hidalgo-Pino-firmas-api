export interface DBData{
	connectionLimit : number,
	host: string;
	user: string;
	password: string;
	database: string;
	namedPlaceholders?:boolean;
	supportBigNumbers?:boolean;
}

export interface DBCondicion{
	operador?:string;
	valor:string|number|Date|Array<string|number|Date>;
}

export interface DBCondiciones{
	[key: string]:DBCondicion|string|number|Date;
}