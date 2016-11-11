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

var normalizePenduduk = function(source){
    var result = {};
    getset(source, result, "Nik", "nik", function(s){return s.replace(new RegExp('[^0-9]', 'g'), "")});
    getset(source, result, "No KK", "no_kk", function(s){return s.replace(new RegExp('[^0-9]', 'g'), "")});
    var propertyNames = [
        "Nama Penduduk",
        "Tempat Lahir",
        "Jenis Kelamin",
        "Pendidikan",
        "Agama",
        "Status Kawin",
        "Pekerjaan",
        "Pekerjaan PED",
        "Kewarganegaraan",
        "Kompetensi",
        "Status Penduduk",
        "Status Tinggal",
        "Golongan Darah",
        "RT",
        "RW",
        "Nama Dusun",
        "Alamat Jalan",
        "Nama Ayah",
        "Nama Ibu",
        "Difabilitas",
        "Kontrasepsi",
        "No Kitas",
        "No Paspor",
        "Email",
    ];
    for(var p in propertyNames)
    {
        getset(source, result, propertyNames[p]);
    }
    getset(source, result, "Tanggal Lahir (tgl/bln/thn)", "tanggal_lahir");
    getset(source, result, "No Telp", "no_telepon");
    getset(source, result, "Status Keluarga", "hubungan_keluarga");
    
    return result;
}

export var importPenduduk = function(fileName)
{
    var workbook = XLSX.readFile(fileName);
    var sheetName = workbook.SheetNames[0];
    var ws = workbook.Sheets[sheetName]; 
    var csv = XLSX.utils.sheet_to_csv(ws);
    var rows = d3.csvParse(csv);
    var result = rows.map(normalizePenduduk);
    return result;
};

export class PendudukImporter
{
    constructor(){
        this.normalizers = {};
        this.normalizers["nik"] =  function(s){return s.replace(new RegExp('[^0-9]', 'g'), "")};
        this.normalizers["no_kk"] =  function(s){return s.replace(new RegExp('[^0-9]', 'g'), "")};
        this.maps = {};
        this.schema = schemas.penduduk.filter(s => !s.readOnly);
        for(var i = 0; i < this.schema.length; i++){
            var column = this.schema[i];
            this.maps[column.field] = {
                header: column.header,
                target: null,
            };
        }
    }
    
    init(fileName){
        this.fileName = fileName;
        var workbook = XLSX.readFile(fileName);
        var sheetName = workbook.SheetNames[0];
        var ws = workbook.Sheets[sheetName]; 
        var csv = XLSX.utils.sheet_to_csv(ws);
        this.rows = d3.csvParse(csv);
        if(this.rows.length > 0){
            var obj = this.rows[0];
            this.availableTargets = Object.keys(obj);
            for(var i = 0; i < this.schema.length; i++){
                var column = this.schema[i];
                var map = this.maps[column.field];
                map.target = null;
                if(column.field in obj){
                    map.target = column.field;
                } else if(column.header in obj){
                    map.target = column.header;
                }else if(column.importHeaders){
                    for(var j = 0; j < column.importHeaders.length; j++){
                        var header = column.importHeaders[j];
                        if(header in obj){
                            map.target = header;
                            break;
                        }
                    }
                }
            }
        }
    }
    
    getResults(){
        return this.rows.map(r => this.transform(r));
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

var normalizeApbdes = function(source){
    var result = {};
    var propertyNames = [
        "Kode Rekening",
        "Uraian",
        "Anggaran",
        "Keterangan",
    ];
    for(var p in propertyNames)
    {
        getset(source, result, propertyNames[p]);
    }
    if(!p.uraian)
        getset(source, result, "Detail", "uraian");
    
    return result;
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

export var importApbdes = function(fileName)
{
    var workbook = XLSX.readFile(fileName);
    var sheetName = workbook.SheetNames[0];
    var ws = workbook.Sheets[sheetName]; 
    var csv = XLSX.utils.sheet_to_csv(ws);
    var rows = d3.csvParse(csv);
    var result = rows.map(normalizeApbdes).filter(validApbdes);
    return result;
};

var normalizeIndikator = function(source){
    var result = {};
    var propertyNames = [
        "No",
        "Pertanyaan",
        "Jawaban",
        "Satuan",
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