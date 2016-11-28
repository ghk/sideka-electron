import xlsx from 'xlsx'; 
import d3 from 'd3';
import schemas from '../schemas';


var getset = function(source, result, s, r, columnIndex, fn)
{
    if(!r)
        r = s.toLowerCase().trim().replace(new RegExp('\\s', 'g'), "_");
    if(source[columnIndex]){
        result[r] = source[columnIndex].trim();
        if(fn)
            result[r] = fn(result[r]);
    }
}

var codeGetSet = function(source, result, s, r, columnIndex, fn)
{
    if(!r)
        r = s.toLowerCase().trim().replace(new RegExp('\\s', 'g'), "_");
    var code;
    while(columnIndex < source.length){
        var current = source[columnIndex];
        var i = parseInt(current);
        if(!Number.isFinite(i)){
            break;
        }
        if(!code){
            code = "";
        } else {
            code += ".";
        }
        code += i;
        columnIndex++;
    }
    result[r]=code;
}

var numericNormalizer = function(s) {
    var result = parseInt(s.replace(new RegExp('[^0-9]', 'g'), ""))
    if(!Number.isFinite(result))
        return undefined;
    return result;
};

var digitOnlyNormalizer = function(s) {
    return s.replace(new RegExp('[^0-9]', 'g'), "");
};

export var pendudukImporterConfig = {
    normalizers: {
        "nik": digitOnlyNormalizer,
        "no_kk": digitOnlyNormalizer,
    },
    getsets: {},
    schema: schemas.penduduk,
    isValid: p => Object.keys(p).some(k => p[k])
    ,
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
        "anggaran": numericNormalizer,
    },
    getsets: {
        "kode_rekening": codeGetSet,
    },
    schema: schemas.apbdes,
    isValid: validApbdes,
}

var row_to_array = function(sheet, rowNum, range){
   if(!range)
    range = xlsx.utils.decode_range(sheet['!ref']);
    
   var row = [];
   for(var colNum=range.s.c; colNum<=range.e.c; colNum++){
        var nextCell = sheet[
            xlsx.utils.encode_cell({r: rowNum, c: colNum})
        ];
        if( typeof nextCell === 'undefined' ){
            row.push(void 0);
        } else row.push(nextCell.w);
   }
   return row;
};

var rows_to_matrix = function(sheet, startRow){
   var range = xlsx.utils.decode_range(sheet['!ref']);
   var result = [];
   for(var rowNum = startRow; rowNum <= range.e.r; rowNum++){
       result.push(row_to_array(sheet, rowNum, range));
   }
   return result;
}

export class Importer
{
    constructor(config){
        this.normalizers = config.normalizers;
        this.getsets = config.getsets;
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
    
    normalizeKeys(headers){
        var result = {};
        for(var i = 0; i < headers.length; i++){
            var key = headers[i];
            result[key.toLowerCase().trim()] = key;
        }
        return result;
    }
    
    onSheetNameChanged($event){
        this.sheetName = $event.target.value;
        this.refreshSheet();
    }

    onStartRowChanged($event){
        this.startRow = parseInt($event.target.value);
        if(this.startRow <= 0 || !Number.isFinite(this.startRow))
            this.startRow = 1;
        this.refreshSheet();
    }
    
    refreshSheet(){
        var sheetName = this.sheetName;
        var startRow = this.startRow;

        var workbook = xlsx.readFile(this.fileName);
        this.workSheet = workbook.Sheets[sheetName]; 
        
        this.headerRow = row_to_array(this.workSheet, startRow - 1);
        this.availableTargets = this.headerRow.filter(r => r && r.trim() != "");
            
        var obj = this.normalizeKeys(this.availableTargets);
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
    
    init(fileName){
        this.fileName = fileName;
        var workbook = xlsx.readFile(this.fileName);
        this.sheetNames = workbook.SheetNames;
        this.sheetName = this.sheetNames[0];
        this.refreshSheet();
        this.startRow = 1;
    }
    
    getResults(){
        var rows = rows_to_matrix(this.workSheet, this.startRow);
        console.log(rows[3]);
        return rows.map(r => this.transform(r)).filter(this.isValid);
    }
    
    transform(source){
        var result = {};
        for(var i = 0; i < this.schema.length; i++){
            var column = this.schema[i];
            var map = this.maps[column.field];
            if(!map.target)
                continue;
            var columnIndex = this.headerRow.indexOf(map.target);
            var gs = this.getsets[column.field];
            if(!gs)
                gs = getset;
            gs(source, result, map.target, column.field, columnIndex, this.normalizers[column.field]);
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
    var workbook = xlsx.readFile(fileName);
    var sheetName = workbook.SheetNames[0];
    var ws = workbook.Sheets[sheetName]; 
    var csv = xlsx.utils.sheet_to_csv(ws);
    var rows = d3.csvParse(csv);
    var result = rows.map(normalizeIndikator);
    return result;
};