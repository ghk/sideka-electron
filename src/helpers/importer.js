import XLSX from 'xlsx'; 
import d3 from 'd3';

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
