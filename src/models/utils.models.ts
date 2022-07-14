export interface ComplyFunction<T> {
	(agent: T, value: any): boolean
}

export interface ComponentResponse<DataType> {
	data: DataType[],
	count: number
}

export interface Pagination {
	page: number,
	items?: number
}

export interface Order {
	field: string,
	direction: 'ASC' | 'DESC'
}

export interface DateRange {
	start_date: Date | string,
	end_date: Date | string
}

export interface VETAFile {
	id: number,
	filename: string,
	og_filename: string,
	filesize: number
}

