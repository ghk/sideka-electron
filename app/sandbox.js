(function () {'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var XLSX = _interopDefault(require('xlsx'));
var d3 = _interopDefault(require('d3'));
var $ = _interopDefault(require('jquery'));

var pendudukSchema = [
    {
        header: 'Nik',
        field: 'nik', 
        width: 140,
        type: 'text'
    },
    {
        header: 'Nama Penduduk',
        field: 'nama_penduduk', 
        width: 250,
        type: 'text'
    },
    {
        header: 'Tempat Lahir',
        field: 'tempat_lahir', 
        width: 120,
        type: 'text'
    },
    {
        header: 'Tanggal Lahir',
        field: 'tanggal_lahir', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 100,
    },
    {
        header: 'J. Kelamin',
        field: 'jenis_kelamin',
        type: 'dropdown',
        source: ['Laki - laki', 'Perempuan'],
        width: 90,
        importHeaders: ["Jenis Kelamin"],
    },
    {
        header: 'Pendidikan',
        field: 'pendidikan', 
        type: 'dropdown',
        source: ['Tidak Pernah Sekolah', 'Tidak dapat membaca' ,'Belum Masuk TK/PAUD', 'Sedang SD/Sederajat', 'Tamat SD/Sederajat', 
        'Sedang SMP/Sederajat', 'Tamat SMP/Sederajat', 'Sedang SMA/Sederajat', 'Tamat SMA/Sederajat',
        'Sedang D-3/Sederajat', 'Tamat D-3/Sederajat', 'Sedang S-1/Sederajat', 'Tamat S-1/Sederajat', 
        'Sedang S-2/Sederajat', 'Tamat S-2/Sederajat', 'Sedang S-3/Sederajat', 'Tamat S-3/Sederajat', 
        'Tidak Diketahui'],
        width: 150,

    },
    {
        header: 'Agama',
        field: 'agama', 
        type: 'dropdown',
        source: ['Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Konghuchu', 
        'Aliran Kepercayaan Kepada Tuhan YME', 'Aliran Kepercayaan Lainnya', 'Tidak Diketahui'],
        width: 70,
    },
    {   
        header: 'Status Kawin',
        field: 'status_kawin', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'],
        width: 100,
    },
    {
        header: 'Pekerjaan',
        field: 'pekerjaan', 
        type: 'dropdown',
        source: ["Tidak Diketahui","BELUM/TIDAK BEKERJA","MENGURUS RUMAH TANGGA","PELAJAR/MAHASISWA","PENSIUNAN","PEGAWAI NEGERI SIPIL (PNS)","TENTARA NASIONAL INDONESIA (TNI)","KEPOLISIAN RI ","PERDAGANGAN","PETANI/PEKEBUN","PETERNAK","NELAYAN/PERIKANAN","INDUSTRI","KONSTRUKSI","TRANSPORTASI","KARYAWAN SWASTA","KARYAWAN BUMN","KARYAWAN HONORER","BURUH HARIAN LEPAS","BURUH TANI/PERKEBUNAN","BURUH NELAYAN/PERIKANAN","BURUH PETERNAKAN","PEMBANTU RUMAH TANGGA","TUKANG CUKUR","TUKANG BATU","TUKANG LISTRIK","TUKANG KAYU","TUKANG SOL SEPATU","TUKANG LAS/PANDAI BESI","TUKANG JAIT","TUKANG GIGI","PENATA RIAS","PENATA BUSANA","PENATA RAMBUT","MEKANIK","SENIMAN","TABIB","PARAJI","PERANCANG BUSANA","PENTERJEMAH","IMAM MASJID","PENDETA","PASTOR","WARTAWAN","USTADZ/MUBALIGH","JURU MASAK","PROMOTOR ACARA","ANGGOTA DPR RI","ANGGOTA DPD","ANGGOTA BPK","PRESIDEN","WAKIL PRESIDEN","ANGGOTA MAHKAMAH KONSTITUSI","DUTA BESAR","GUBERNUR","WAKIL GUBERNUR","BUPATI","WAKIL BUPATI","WALIKOTA","WAKIL WALIKOTA","ANGGOTA DPRD PROP","ANGGOTA DPRD KAB. KOTA","DOSEN","GURU","PILOT","PENGACARA","NOTARIS","ARSITEK","AKUNTAN","KONSULTAN","DOKTER","BIDAN","PERAWAT","APOTEKER","PSIKIATER/PSIKOLOG","PENYIAR TELEVISI","PENYIAR RADIO","PELAUT","PENELITI","SOPIR","PIALANG","PARANORMAL","PEDAGANG","PERANGKAT DESA","KEPALA DESA","BIARAWATI","WIRASWASTA","BURUH MIGRAN"],
        width: 200,
    },
    {
        header: 'Pekerjaan PED',
        field: 'pekerjaan_ped', 
        type: 'dropdown',
        source: ["Tidak Diketahui","Petani","Pedagang","Petani Kebun","Tukang Batu / Jasa Lainnya","Seniman"],
        width: 120,
    },
    {
        header: 'WN',
        field: 'kewarganegaraan', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'WNI', 'WNA', 'DWIKEWARGANEGARAAN'],
        width: 70,
        importHeaders: ["Kewarganegaraan"],
    },
    {
        header: 'Kompetensi',
        field: 'kompetensi', 
        type: 'dropdown',
        source: ["Tidak Diketahui","Kesehatan","Profesional Bangunan","Profesional Kelistrikan","Profesional Pendidikan"],
        width: 120,
    },
    {
        header: 'No Telepon',
        field: 'no_telepon', 
        type: 'text',
        width: 100,
        importHeaders: ["No Telp"],
    },
    {
        header: 'Email',
        field: 'email', 
        type: 'text',
        width: 100,
    },
    {   
        header: 'No Kitas',
        field: 'no_kitas', 
        type: 'text',
        width: 100,
    },
    {
        header: 'No Paspor',
        field: 'no_paspor', 
        type: 'text',
        width: 100,
    },
    {
        header: 'Gol. Darah',
        field: 'golongan_darah', 
        type: 'dropdown',
        source: ['A', 'A+', 'A-', 'B', 'B+', 'B-', 'AB', 'AB+', 'AB-', 'O', 'O+', 'O-', 'Tidak Diketahui'],
        width: 100,
        importHeaders: ["Golongan Darah"],
    },
    {
        header: 'Status Penduduk',
        field: 'status_penduduk', 
        type: 'dropdown',
        source: ['Tidak diketahui', 'Tinggal Tetap', 'Meninggal', 'Pindahan Keluar', 'Pindahan Masuk'],
        width: 140,
    },
    {   
        header: 'Status Tinggal',
        field: 'status_tinggal', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Tinggal Tetap', 'Tinggal di luar desa (dalam 1 kab/kota)',
        'Tinggal di luar kota','Tinggal di luar provinsi','Tinggal di luar negeri'],
        width: 150,
    },
    {
        header: 'Kontrasepsi',
        field: 'kontrasepsi', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Pil', 'Suntik', 'IUD', 'Kondom', 'Implant', 'MOP', 'MOW'],
        width: 100,
    },
    {
        header: 'Difabilitas',
        field: 'difabilitas', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Tidak Cacat', 'Cacat Fisik', 'Cacat Netra / Buta', 'Cacat Rungu / Wicara', 'Cacat Mental / Jiwa', 'Cacat Lainnya']
    },
    {
        header: 'No KK',
        field: 'no_kk', 
        type: 'text'
    },
    {
        header: 'Nama Ayah',
        field: 'nama_ayah', 
        type: 'text'
    },
    {
        header: 'Nama Ibu',
        field: 'nama_ibu', 
        type: 'text'
    },
    {
        header: 'Hubungan Keluarga',
        field: 'hubungan_keluarga', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Kepala Keluarga', 'Suami', 'Istri', 'Anak', 'Menantu', 'Mertua', 'Famili Lain'],
        importHeaders: ["Status Keluarga"],
    },
    {
        header: 'Nama Dusun',
        field: 'nama_dusun', 
        type: 'text'
    },
    {   
        header: 'RW',
        field: 'rw', 
        type: 'text',
        width: 70,
    },
    {
        header: 'RT',
        field: 'rt', 
        type: 'text',
        width: 70,
    },
    {
        header: 'Alamat Jalan',
        field: 'alamat_jalan', 
        type: 'text'
    },
];

var keluargaSchema = [
    {
        header: 'No KK',
        field: 'no_kk', 
        type: 'text',
        readOnly: true,
    },
    {
        header: 'Nama Kepala Keluarga',
        field: 'nama_kepala_keluarga', 
        type: 'text',
        readOnly: true,
        width: 250,
    },
    {
        header: 'NIK Kepala Keluarga',
        field: 'nik_kepala_keluarga', 
        type: 'text',
        readOnly: true,
    },
    {
        header: '# Anggota',
        field: 'jumlah_anggota', 
        type: 'numeric',
        readOnly: true,
        width: 120,
    },
    {
        header: 'Dusun',
        field: 'dusun', 
        type: 'text',
    },
    {
        header: 'RW',
        field: 'rw', 
        type: 'text',
    },
    {
        header: 'RT',
        field: 'rt', 
        type: 'text',
    },
    {
        header: 'Alamat Jalan',
        field: 'alamat_jalan', 
        type: 'text',
    },
    {
        header: 'Kelas Sosial',
        field: 'kelas_sosial', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Kaya', 'Sedang', 'Miskin', 'Sangat Miskin']
    },
    {
        header: 'Raskin',
        field: 'raskin', 
        type: 'checkbox',
        checkedTemplate: 'ya',
        uncheckedTemplate: 'tidak',
        width: 100,
    },
    {
        header: 'BPJS',
        field: 'bpjs', 
        type: 'checkbox',
        checkedTemplate: 'ya',
        uncheckedTemplate: 'tidak',
        width: 100,
    },
    {
        header: 'KIP',
        field: 'kip', 
        type: 'checkbox',
        checkedTemplate: 'ya',
        uncheckedTemplate: 'tidak',
        width: 100,
    },
    {
        header: 'PKH',
        field: 'pkh', 
        type: 'checkbox',
        checkedTemplate: 'ya',
        uncheckedTemplate: 'tidak',
        width: 100,
    },
]

var Handsontable = {}
try {
    Handsontable = require('./handsontablep/dist/handsontable.full.js');
} catch(e){
    console.log("no window", e);
}

function monospaceRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    $(td).addClass('monospace');
    return td;
}

function kodeRekeningValidator(value, callback){
    var data = this.instance.getDataAtCol(this.col);
    var index = data.indexOf(value);
    var valid = true;
    if (value && index > -1 && this.row !== index) {
        valid = false;
    }
    callback(valid);
}


function anggaranRenderer(instance, td, row, col, prop, value, cellProperties) {
    var isSum = false;
    if(instance.sumCounter && !Number.isFinite(value) && !value){
        var code = instance.getDataAtCell(row, 0);
        if(code){
            isSum = true;
            value = instance.sumCounter.sums[code];
        }
    }
    var args = [instance, td, row, col, prop, value, cellProperties];
    Handsontable.renderers.NumericRenderer.apply(this, args);
    $(td).addClass('anggaran');
    $(td).removeClass('sum');
    if(isSum)
        $(td).addClass('sum');
    if(td.innerHTML && td.innerHTML.length > 0){
        var maxLength = 24;
        var length = td.innerHTML.length;
        td.innerHTML = "Rp. "+new Array(maxLength - length).join(" ")+td.innerHTML;
    }
    return td;
}

function anggaranValidator(value, callback){
    var data = this.instance.getDataAtCol(this.col);
    var valid = true;
    if(this.instance.sumCounter && Number.isFinite(value) && value){
        var code = this.instance.getDataAtCell(this.row, 0);
        if(code){
            var sumValue = this.instance.sumCounter.sums[code];
            if(sumValue && value !== sumValue){
                valid = false;
            }
        }
    }
    callback(valid);
}

function uraianRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    var level = 4;
    var code = instance.getDataAtCell(row, 0);
    if(code && code.split){
        level = code.split(".").length - 1;
    }
    td.style.paddingLeft = (4 + (level * 15))+"px";
    return td;
}

var apbdesSchema = [
    {
        header: 'Kode Rekening',
        field: 'kode_rekening', 
        type: 'text',
        width: 100,
        renderer: monospaceRenderer,
        validator: kodeRekeningValidator,
    },
    {
        header: 'Uraian',
        field: 'uraian', 
        type: 'text',
        width: 450,
        renderer: uraianRenderer,
    },
    {
        header: 'Anggaran',
        field: 'anggaran', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        language: 'id-ID' ,
        validator: anggaranValidator,
        renderer: anggaranRenderer
        
    },
    {
        header: 'Keterangan',
        field: 'keterangan', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Kategori',
        field: 'kategori', 
        type: 'dropdown',
        source: ['', 'Kesehatan', 'Pendidikan', 'Jalan', 'Pertanian', 'Perikanan', 'Pariwisata', 'Kantor Desa']
    },
]

var indikatorSchema = [
    {
        header: 'No',
        field: 'no', 
        type: 'text',
        readOnly: true,
        width: 70,
        renderer: monospaceRenderer
    },
    {
        header: 'Indikator',
        field: 'indikator', 
        type: 'text',        
        readOnly: true,
        width: 400,
    },
    {
        header: 'Nilai',
        field: 'nilai', 
        type: 'numeric',
        width: 100,
    },
    {
        header: 'Satuan',
        field: 'satuan', 
        type: 'text',
        readOnly: true,
        width: 200,
    },
    {
        header: 'Sasaran Nasional',
        field: 'sasaran_nasional', 
        type: 'text',        
        readOnly: true,
        width: 1400,
    },
]




var schemas = {
    penduduk: pendudukSchema,
    keluarga: keluargaSchema,
    apbdes: apbdesSchema,
    indikator: indikatorSchema,
    getHeader: function(schema){
        return schema.map(function(c){return c.header});
    },
    objToArray: function(obj, schema){
        var result = [];
        for(var i = 0; i < schema.length; i++){
            result.push(obj[schema[i].field]);
        }
        return result;
    },
    arrayToObj: function(arr, schema){
        var result = {};
        for(var i = 0; i < schema.length; i++){
            result[schema[i].field] = arr[i];
        }
        return result;
    },
    getColWidths: function(schema){
        var result = [];
        for(var i = 0; i < schema.length; i++){
            var width = schema[i].width;
            if(!width)
                width = 150;
            result.push(width);
        }
        return result;
    },
    registerCulture: function(window){
        var a= {
            langLocaleCode:"id-ID", cultureCode:"id-ID", delimiters: {
                thousands: ".", decimal: ","
            }
            , abbreviations: {
                thousand: "k", million: "m", billion: "b", trillion: "t"
            }
            , ordinal:function(a) {
                var b=a%10;
                return 1===~~(a%100/10)?"th": 1===b?"st": 2===b?"nd": 3===b?"rd": "th"
            }
            , currency: {
                symbol: "Rp. ", position: "prefix"
            }
            , defaults: {
                currencyFormat: ",4 a"
            }
            , formats: {
                fourDigits: "4 a", fullWithTwoDecimals: "$ ,0.00", fullWithTwoDecimalsNoCurrency: ",0.00", fullWithNoDecimals: "$ ,0"
            }
        }
        ;
        // CommonJS
        window.numbro.culture(a.cultureCode, a);
    }
};

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

var apbdesImporterConfig = {
    normalizers: {
        "anggaran": function(s){return parseInt(s.replace(new RegExp('[^0-9]', 'g'), ""))},
    },
    schema: schemas.apbdes,
    isValid: validApbdes,
}


class Importer
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

        var workbook = XLSX.readFile(this.fileName);
        var ws = workbook.Sheets[sheetName]; 
        var csv = XLSX.utils.sheet_to_csv(ws);
        if(startRow > 1)
            csv = csv.slice(startRow - 1);
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
        this.refreshSheet();
        this.startRow = 1;
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

var importer = new Importer(apbdesImporterConfig);
importer.init("C:\\Users\\Egoz\\Desktop\\desa\\APBDES NAPAN\\LAMPIRAN APBDes  2016.xlsx")
console.log(importer.maps)
}());
//# sourceMappingURL=sandbox.js.map