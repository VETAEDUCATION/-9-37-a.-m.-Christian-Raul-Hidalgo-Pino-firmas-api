import * as FileSys from 'fs';


export var CONFIG = JSON.parse(FileSys.readFileSync('./configuracion.json', 'utf8'));
export var LANG = {
    "ES": 1,
    "EN": 2
}
