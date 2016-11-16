import XLSX from 'xlsx'; 
import d3 from 'd3';
import schemas from '../schemas';


var getset = function(source, result, s, r, fn)
{
    if(!r)
        r = s.toLowerCase().trim().replace(new RegExp('\\s', 'g'), "_");
    if(source[s]){
        result[r] = source[s].trim();
        if(fn)
            result[r] = fn(result[r]);
    }
}

export var pendudukImporterConfig = {
    normalizers: {
        "nik": function(s){return s.replace(new RegExp('[^0-9]', 'g'), "")},
        "no_kk": function(s){return s.replace(new RegExp('[^0-9]', 'g'), "")},
    },
    schema: schemas.penduduk,
    isValid: p => true,
}

var validApbdes = function(row){
    if(row.anggaran){
        return true;
    }
    if(row.uraian && row.uraian.trim()){
        return true;
    }
    if(row.kode_rekening && row.kode_rekening.trim()){
        return true;
    }
    return false;
}

export var apbdesImporterConfig = {
    normalizers: {
        "anggaran": function(s){return parseInt(s.replace(new RegExp('[^0-9]', 'g'), ""))},
    },
    schema: schemas.apbdes,
    isValid: validApbdes,
}


export class Importer
{
    constructor(config){
        this.normalizers = config.normalizers;
        this.schema = config.schema.filter(s => !s.readOnly);
        this.isValid = config.isValid;
        this.maps = {};
        for(var i = 0; i < this.schema.length; i++){
            var column = this.schema[i];
            this.maps[column.field] = {
                header: column.header,
                target: null,
            };
        }
    }
    
    normalizeKeys(obj){
        var result = {};
        for(var key in obj){
            result[key.toLowerCase().trim()] = key;
        }
        return result;
    }
    
    onSheetNameChanged($event, sheetName){
        if($event)
            sheetName = $event.target.value;
        var workbook = XLSX.readFile(this.fileName);
        var ws = workbook.Sheets[sheetName]; 
        var csv = XLSX.utils.sheet_to_csv(ws);
        this.rows = d3.csvParse(csv);
        if(this.rows.length > 0){
            var obj = this.normalizeKeys(this.rows[0]);
            this.availableTargets = Object.keys(this.rows[0]);
            for(var i = 0; i < this.schema.length; i++){
                var column = this.schema[i];
                var map = this.maps[column.field];
                map.target = null;
                if(column.field.toLowerCase().trim() in obj){
                    map.target = obj[column.field.toLowerCase().trim()];
                } else if(column.header.toLowerCase().trim() in obj){
                    map.target = obj[column.header.toLowerCase().trim()];
                }else if(column.importHeaders){
                    for(var j = 0; j < column.importHeaders.length; j++){
                        var header = column.importHeaders[j];
                        if(header.toLowerCase().trim() in obj){
                            map.target = obj[header.toLowerCase().trim()];
                            break;
                        }
                    }
                }
            }
        }
    }
    
    init(fileName){
        this.fileName = fileName;
        var workbook = XLSX.readFile(this.fileName);
        this.sheetNames = workbook.SheetNames;
        this.sheetName = this.sheetNames[0];
        this.onSheetNameChanged(null, this.sheetName);
    }
    
    getResults(){
        return this.rows.map(r => this.transform(r)).filter(this.isValid);
    }
    
    transform(source){
        var result = {};
        for(var i = 0; i < this.schema.length; i++){
            var column = this.schema[i];
            var map = this.maps[column.field];
            if(!map.target)
                continue;
            getset(source, result, map.target, column.field, this.normalizers[column.field]);
        }
        return result;
    }
}

var normalizeIndikator = function(source){
    var result = {};
    var propertyNames = [
        "No",
        "Indikator",
        "Nilai",
        "Satuan",
        "Sasaran Nasional",
    ];
    for(var p in propertyNames)
    {
        getset(source, result, propertyNames[p]);
    }
    
    return result;
}

export var importTPB = function(fileName)
{
    var workbook = XLSX.readFile(fileName);
    var sheetName = workbook.SheetNames[0];
    var ws = workbook.Sheets[sheetName]; 
    var csv = XLSX.utils.sheet_to_csv(ws);
    var rows = d3.csvParse(csv);
    var result = rows.map(normalizeIndikator);
    return result;
};