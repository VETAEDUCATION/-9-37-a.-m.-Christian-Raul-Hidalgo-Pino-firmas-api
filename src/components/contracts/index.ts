import { Component } from "../../dependencies";
import { CONN } from "../../instances";
import { Contract, ContractRaw } from "../../models/contract.models";
import * as queries from './queries';

export class Contracts extends Component<ContractRaw, Contract>{
    queries = { get: queries.GET_ALL };
    connection = CONN

    _get = (params, req) => {
        if (params.id) {
            params.filter = {
                id: params.id
            };
            delete params.id;
        }
        return super._get(params, req);
    }
}