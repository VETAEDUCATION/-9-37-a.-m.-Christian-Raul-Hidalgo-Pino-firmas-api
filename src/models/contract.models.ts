export interface Contract {
    id: string,
    pdfLink: string,
    signature_path?: string,
    date_created: string | Date,
    date_modified: string | Date
}

export interface ContractRaw {
    id: string,
    pdfLink: string,
    signature_path?: string,
    date_created: string | Date,
    date_modified: string | Date
}