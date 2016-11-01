(function () {'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _angular_core = require('@angular/core');
var _angular_platformBrowser = require('@angular/platform-browser');
var _angular_platformBrowserDynamic = require('@angular/platform-browser-dynamic');
var _angular_common = require('@angular/common');
var _angular_router = require('@angular/router');
var _angular_http = require('@angular/http');
var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));
var $ = _interopDefault(require('jquery'));
var electron = require('electron');
var jetpack = _interopDefault(require('fs-jetpack'));
var Docxtemplater = _interopDefault(require('docxtemplater'));
var XLSX = _interopDefault(require('xlsx'));
var d3 = _interopDefault(require('d3'));
var Excel = _interopDefault(require('exceljs'));
var request = _interopDefault(require('request'));
var expressions = _interopDefault(require('angular-expressions'));
var moment = _interopDefault(require('moment'));

var UndoRedoComponent = _angular_core.Component({
    selector: 'undo-redo',
    inputs : ['hot'], 
    templateUrl: 'templates/undoRedo.html',
})
.Class({
    constructor: function() {
    },
});

var OnlineStatusComponent = _angular_core.Component({
    selector: 'online-status',
    templateUrl: 'templates/onlineStatus.html',
})
.Class({
    constructor: function() {
        window.addEventListener('online',  () => this.updateOnlineStatus());
        window.addEventListener('offline',  () => this.updateOnlineStatus());
        this.updateOnlineStatus()
    },
    updateOnlineStatus: function(){
        this.src = "sideka.png";
        this.title = "Sideka Anda Online, dan terkoneksi dengan internet";
        if(!navigator.onLine){
            this.src = "sideka-offline.png";
            this.title = "Sideka Anda dalam mode offline";
        }
    }
});

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

var importPenduduk = function(fileName)
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

var importApbdes = function(fileName)
{
    var workbook = XLSX.readFile(fileName);
    var sheetName = workbook.SheetNames[0];
    var ws = workbook.Sheets[sheetName]; 
    var csv = XLSX.utils.sheet_to_csv(ws);
    var rows = d3.csvParse(csv);
    var result = rows.map(normalizeApbdes).filter(validApbdes);
    return result;
};

var pendudukSchema = [
    {
        header: 'NIK',
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
        source: ["Tidak Diketahui","Tidak Diketahui","Petani","Pedagang","Petani Kebun","Tukang Batu / Jasa Lainnya","Seniman"],
        width: 120,
    },
    {
        header: 'WN',
        field: 'kewarganegaraan', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'WNI', 'WNA', 'DWIKEWARGANEGARAAN'],
        width: 70,
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
    },
    {
        header: 'RT',
        field: 'rt', 
        type: 'text',
        width: 70,
    },
    {   
        header: 'RW',
        field: 'rw', 
        type: 'text',
        width: 70,
    },
    {
        header: 'Nama Dusun',
        field: 'nama_dusun', 
        type: 'text'
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
        header: 'Alamat Jalan',
        field: 'alamat_jalan', 
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
        source: ['Tidak Diketahui', 'Kepala Keluarga', 'Suami', 'Istri', 'Anak', 'Menantu', 'Mertua', 'Famili Lain']
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
        header: 'Alamat',
        field: 'alamat', 
        type: 'text',
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
        header: 'Jamkesmas',
        field: 'jamkesmas', 
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

var Handsontable$1 = require('./handsontablep/dist/handsontable.full.js');
function monospaceRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable$1.renderers.TextRenderer.apply(this, arguments);
    td.className = 'monospace';
    return td;
}

function anggaranRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable$1.renderers.NumericRenderer.apply(this, arguments);
    td.className = 'anggaran';
    if(td.innerHTML && td.innerHTML.length > 0){
        var maxLength = 24;
        var length = td.innerHTML.length;
        td.innerHTML = "Rp. "+new Array(maxLength - length).join(" ")+td.innerHTML;
    }
    return td;
}
function uraianRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable$1.renderers.TextRenderer.apply(this, arguments);
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
        renderer: monospaceRenderer
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
        renderer: anggaranRenderer
        
    },
    {
        header: 'Keterangan',
        field: 'keterangan', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Tag',
        field: 'tag', 
        type: 'dropdown',
        source: ['Kesehatan', 'Infrastruktur', 'Ekonomi', 'Pendidikan', 'Kantor Desa', 'Belanja Pegawai']
    },
]


var schemas = {
    penduduk: pendudukSchema,
    keluarga: keluargaSchema,
    apbdes: apbdesSchema,
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

// native electron module
var exportToExcel= function(data,headers,width,nameSheet){
	var workbook = new Excel.Workbook();
	workbook.creator = "Sideka";
	workbook.created = new Date();
	var sheet = workbook.addWorksheet(nameSheet);
	var worksheet = workbook.getWorksheet(nameSheet);
	var dataHeader =[];
	var style={
		font : { name: 'Times New Roman', family: 4, size: 12, bold: true },		
		alignment: { vertical: "middle", horizontal: "center" },
		border: {top: {style:'thin'},left: {style:'thin'},bottom: {style:'thin'},right: {style:'thin'}}

	};

	if(nameSheet.toLowerCase() !="apbdes"){		
		for(var C = 0; C != headers.length; ++C) {
			var row = 1;
			var cell =  generateColumn(row,C);
			if (!headers[C]) headers[C] = '';
			worksheet.getCell(cell).value = headers[C];	
			worksheet.getCell(cell).style = style;	
			worksheet.getColumn(C+1).width = width[C];				
		}
	}else{
		var col=1;
		for(var C = 0; C != headers.length; ++C) {
			var row = 1;
			if(C==0){
				for(var i=0;i<=3;i++){
					var cell =  generateColumn(row,i);
					if (!headers[C]) headers[C] = '';
					worksheet.getCell(cell).value = headers[C];	
					worksheet.getColumn(col).width = width[C];				
					worksheet.getCell(cell).style = style;					
					col++;
				}
			}else{
				var cell =  generateColumn(row,col-1);
				if (!headers[C]) headers[C] = '';
				worksheet.getCell(cell).value = headers[C];	
				worksheet.getColumn(col).width = width[C];				
				worksheet.getCell(cell).style = style;	
				col++;							
			}	
		}		
		worksheet.mergeCells("A1:D1");
	}
	

	//data
	for(var R = 0; R < data.length; ++R) {
		var data_row=[];
		for(var C = 0; C != data[R].length; ++C) {
			var row = R+2;
			var cell =  generateColumn(row,C)
			var getCell = String.fromCharCode(65+C);	

			if(nameSheet.toLowerCase() =="apbdes"){
				worksheet.getRow(1).height = 42;
				if(getCell=='F')
					worksheet.getCell(cell).numFmt  = '#,##0';				
				if(C<=4)
					worksheet.getCell(cell).alignment = style.alignment;
			}
			if (!data[R][C]) data[R][C] = '';			
			worksheet.getCell(cell).value = data[R][C];
			worksheet.getCell(cell).border = { 
				top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
			};
		}
	}
	
	var fileName = electron.remote.dialog.showSaveDialog({
		filters: [
			{name: 'Excel Workbook', extensions: ['xlsx']},
		]
	});

	if(fileName){
		workbook.xlsx.writeFile(fileName).then(
			function() {
				electron.shell.openItem(fileName);
			},
			function(e){
				var message = "File Masih Digunakan"
				if(e.code != "EBUSY")
					message = e.message;
					
				electron.remote.dialog.showErrorBox("Error", message);
		});
	}
}

var generateColumn = function (Row, numberColumn){
	var indexOf =  function(i){
    return (i >= 26 ? indexOf((i / 26 >> 0) - 1) : '') +
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26 >> 0];
	}
	return indexOf(numberColumn)+Row;
}

var convertWidth = function(width){
	var data = [];
	for(var i=0; i != width.length; i++){
		data.push(width[i]/7);
	}
	return data;
}

var checkNum= function(n) { 
	return /^-?[\d.]+(?:e-?\d+)?$/.test(n) 
}

var parseAccountCode = function(data){
	var result=[];
	for(var i = 0; i != data.length;i++){
		var parse =[];
		for(var x = 0; x != data[i].length; x++){			
			if(x==0){									
				var accountCode=[];
				if(data[i][x]!= null) accountCode = data[i][0].split(".");				
				for(var j=0;j!=4;j++){
					var isNumber = checkNum(accountCode[j]);
					if(isNumber) parse.push(parseInt(accountCode[j]));
					else parse.push(null);
				}
			}else{
				var isNumber = checkNum(data[i][x]);
				if(isNumber) parse.push(parseInt(data[i][x]));
				else parse.push(data[i][x]);
			}
		}
		result.push(parse);
	}
	return result;	 
}

var exportPenduduk = function(data, nameSheet)
{	
    var headers = schemas.getHeader(schemas.penduduk);   
	var width = convertWidth(schemas.getColWidths(schemas.penduduk));  
	exportToExcel(data,headers,width,nameSheet);
	
};

var exportKeluarga = function(data,nameSheet)
{
	var headers = schemas.getHeader(schemas.keluarga);    
	var width = convertWidth(schemas.getColWidths(schemas.penduduk)); 
	exportToExcel(data,headers,width,nameSheet);	
	
};

var exportApbdes = function(data, nameSheet)
{	
	var headers = schemas.getHeader(schemas.apbdes);
	var apbdes_data = parseAccountCode(data); 
	var width = [4,50,25,30];
	exportToExcel(apbdes_data,headers,width,nameSheet);	
};

// Simple wrapper exposing environment variables to rest of the code.

// The variables have been written to `env.json` by the build process.
var env = jetpack.cwd(__dirname).read('env.json', 'json');

// module loaded from npm
var SERVER = "http://api.sideka.id";
if(env.name !== "production")
    SERVER = "http://10.10.10.107:5000";
var app$1 = electron.remote.app;
var DATA_DIR = app$1.getPath("userData");
var CONTENT_DIR = path.join(DATA_DIR, "contents");
jetpack.dir(CONTENT_DIR);

var dataapi = {
    
    auth: null,

    getActiveAuth: function () {
        var authFile = path.join(DATA_DIR, "auth.json");
        if(!jetpack.exists(authFile))
            return null;
        return JSON.parse(jetpack.read(authFile));
    },

    saveActiveAuth: function(auth) {
        var authFile = path.join(DATA_DIR, "auth.json");
        if(auth)
            jetpack.write(authFile, JSON.stringify(auth));
        else
            jetpack.remove(authFile);
    },

    login: function(user, password, callback){
        request({
            url: SERVER+"/login",
            method: "POST",
            json: {"user": user, "password": password},
        }, callback);
    },
    
    getContentSubTypes: function(type, callback){
        var fileName = path.join(CONTENT_DIR, type+"_subtypes.json");
        var fileContent = [];
        var auth = this.getActiveAuth();

        if(jetpack.exists(fileName)){
            fileContent =  JSON.parse(jetpack.read(fileName));
        }
        request({
            url: SERVER+"/content/"+auth.desa_id+"/"+type+"/subtypes",
            method: "GET",
            headers: {
                "X-Auth-Token": auth.token.trim()
            }
        }, function(err, response, body){
            if(!response || response.statusCode != 200) {
                callback(fileContent);
            } else {
                jetpack.write(fileName, body);
                callback(JSON.parse(body));
            }
        });
    },
    
    getContent: function(type, subType, defaultValue, callback){
        var fileName = path.join(CONTENT_DIR, type+".json");
        if(subType)
            fileName = path.join(CONTENT_DIR, type+"_"+subType+".json");
        var fileContent = defaultValue;
        var timestamp = 0;
        var auth = this.getActiveAuth();

        if(jetpack.exists(fileName)){
            fileContent =  JSON.parse(jetpack.read(fileName));
            timestamp = fileContent.timestamp;
        }
        var url = SERVER+"/content/"+auth.desa_id+"/"+type+"?timestamp="+timestamp;
        if(subType)
            url = SERVER+"/content/"+auth.desa_id+"/"+type+"/"+subType+"?timestamp="+timestamp;
        request({
            url: url,
            method: "GET",
            headers: {
                "X-Auth-Token": auth.token.trim()
            }
        }, function(err, response, body){
            if(!response || response.statusCode != 200) {
                callback(fileContent);
            } else {
                jetpack.write(fileName, body);
                callback(JSON.parse(body));
            }
        });
    },
    
    saveContent: function(type, subType, content, callback){
        var fileName = path.join(CONTENT_DIR, type+".json");
        if(subType)
            fileName = path.join(CONTENT_DIR, type+"_"+subType+".json");
        jetpack.write(fileName, JSON.stringify(content));
        var auth = this.getActiveAuth();
        var url= SERVER+"/content/"+auth.desa_id+"/"+type;
        if(subType)
            url= SERVER+"/content/"+auth.desa_id+"/"+type+"/"+subType;
        request({
            url: url,
            method: "POST",
            headers: {
                "X-Auth-Token": auth.token.trim()
            },
            json: content
        }, function(err, response, body){
            if(!response || response.statusCode != 200) {
                //todo, save later
            } 
            if(callback)
                callback(err, response, body);
        });
    }
    
    
}

var Handsontable$2 = require('./handsontablep/dist/handsontable.full.js');

function initializeTableSearch(hot, document, formSearch, inputSearch){
    var queryResult;
    var currentResult = 0;
    var lastQuery = null;
    var lastSelectedResult = null;

    Handsontable$2.Dom.addEvent(inputSearch, 'keyup', function(event) {
        if (event.keyCode === 27){
            inputSearch.blur();
            hot.listen();
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if(lastQuery == this.value)
            return;
            
        lastQuery = this.value;
        currentResult = 0;
        queryResult = hot.search.query(this.value);
        hot.render();
        lastSelectedResult = null;
    });
    
    function keyup(e) {
        //ctrl+f
        if (e.ctrlKey && e.keyCode == 70){
            e.preventDefault();
            e.stopPropagation();
            inputSearch.select();
            hot.unlisten();
        }
    }
    document.addEventListener('keyup', keyup, false);

    formSearch.onsubmit = function(){
        if(queryResult && queryResult.length){
            var firstResult = queryResult[currentResult];
            hot.selection.setRangeStart(new WalkontableCellCoords(firstResult.row,firstResult.col));
            hot.selection.setRangeEnd(new WalkontableCellCoords(firstResult.row,firstResult.col));
            lastSelectedResult = firstResult;
            inputSearch.focus();
            currentResult += 1;
            if(currentResult == queryResult.length)
                currentResult = 0;
        }
        return false;
    };
}

function initializeTableSelected(hot, index, spanSelected){
    var lastText = null;
    Handsontable$2.hooks.add('afterSelection', function(r, c, r2, c2) {
        var s = hot.getSelected();
        r = s[0];
        var data = hot.getDataAtRow(r);
        var text = "";
        if(data){
            text = data[index];
        }
        if(text == lastText)
            return;
        spanSelected.innerHTML = lastText = text;
    });
} 

function initializeTableCount(hot, spanCount){
    //bug on first call 
    var firstCall = true; 
    var updateCount = function(){
            var all = hot.getSourceData().length;
            var filtered = hot.getData().length;
            var text = all;
            if(!firstCall && all != filtered){
                text = filtered + " dari " + all;
            }
            spanCount.innerHTML = text;
            firstCall = false; 
    }
    
    Handsontable$2.hooks.add('afterLoadData', function(changes, source) {
            updateCount();
    });
    Handsontable$2.hooks.add('afterFilter', function() {
            updateCount();
    });
}

function initializeOnlineStatusImg(img){
    function updateOnlineStatus(){
        var src = "sideka.png";
        var title = "Sideka Anda Online, dan terkoneksi dengan internet";
        if(!navigator.onLine){
            src = "sideka-offline.png";
            title = "Sideka Anda dalam mode offline";
        }
        console.log(src, navigator);
        $(img).attr("src", src);
        $(img).attr("title", title);
    }

    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline',  updateOnlineStatus);
    updateOnlineStatus()
}

// native electron module
// module loaded from npm
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
window.jQuery = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

var hot;
var sheetContainer;

var init = function () {
    sheetContainer = document.getElementById('sheet');
    window.hot = hot = new Handsontable(sheetContainer, {
        data: [],
        topOverlay: 34,

        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.apbdes),
        columns: schemas.apbdes,

        colWidths: schemas.getColWidths(schemas.apbdes),
        rowHeights: 23,
        
        //columnSorting: true,
        //sortIndicator: true,
        
        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,
        search: true,
        //filters: true,
        contextMenu: ['row_above', 'remove_row'],
        //dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
    });
    
    var formSearch = document.getElementById("form-search");
    var inputSearch = document.getElementById("input-search");
    initializeTableSearch(hot, document, formSearch, inputSearch);
    
    window.addEventListener('resize', function(e){
        hot.render();
    })
    $('.modal').each(function(i, modal){
        $(modal).on('hidden.bs.modal', function () {
            hot.listen();
        })
    });
    schemas.registerCulture(window);
    
};

var isCodeLesserThan = function(code1, code2){
    if(!code2)
        return false;
    var splitted1 = code1.split(".").map(s => parseInt(s));
    var splitted2 = code2.split(".").map(s => parseInt(s));
    var min = Math.min(splitted1.length, splitted2.length);
    for(var i = 0; i < min; i++){
        if(splitted1[i] > splitted2[i]){ 
            return false;
        }
        if(splitted1[i] < splitted2[i]){ 
            return true;
        }
    }

    if(splitted1.length < splitted2.length) 
        return true;
        
    return false;
};

var createDefaultApbdes = function(){
    return [
        ["1", "Pendapatan"],
        ["1.1", "Pendapatan Asli Desa"],
        ["1.1.1", "Hasil Usaha Desa"],
        ["1.2", "Pendapatan Transfer"],
        ["1.2.1", "Dana Desa"],
        ["1.2.2", "Bagian dari Hasil Pajak & Retribusi Daerah Kabupaten/Kota"],
        ["1.2.3", "Alokasi Dana Desa"],
        ["1.2.4", "Bantuan Keuangan"],
        ["1.2.4.1", "Bantuan Keuangan dari APBD Propinsi"],
        ["1.2.4.2", "Bantuan Keuangan dari APBD Kabupaten"],
        ["1.3", "Lain-lain Pendapatan Desa yang Sah"],
        ["1.3.1", "Hibah dan Sumbangan dari Pihak Ke-3 yang Tidak Mengikat"],
        ["2", "Belanja"],
        ["2.1", "Bidang Penyelenggaraan Pemerintah Desa"],
        ["2.2", "Bidang Pelaksanaan Pembangunan Desa"],
        ["2.3", "Bidang Pembinaan Kemasyarakatan"],
        ["2.4", "Bidang Pemberdayaan Masyarakat"],
        ["3", "Pembiayaan"],
        ["3.1", "Penerimaan Pembiayaan"],
        ["3.1.1", "SILPA"],
        ["3.1.2", "Pencairan Dana Cadangan"],
        ["3.1.3", "Hasil Kekayaan Desa yang Dipisahkan"],
        ["3.2", "Pengeluaran Pembiayaan"],
        ["3.2.1", "Pembentukan Dana Cadangan"],
        ["3.2.2", "Penyertaan Modal Desa"],
    ];
}

var ApbdesComponent = _angular_core.Component({
    selector: 'apbdes',
    templateUrl: 'templates/apbdes.html'
})
.Class({
    constructor: function() {
    },
    ngOnInit: function(){
        $("title").html("APBDes - " +dataapi.getActiveAuth().desa_name);
        init();
        this.hot = window.hot;
        this.activeSubType = null;
        dataapi.getContentSubTypes("apbdes", subTypes => {
            this.subTypes = subTypes;
            if(this.subTypes.length)
                this.loadSubType(subTypes[0]);
        });
    },
    loadSubType(subType){
        dataapi.getContent("apbdes", subType, [], content => {
            this.activeSubType = subType;
            hot.loadData(content.data);
            setTimeout(function(){
                hot.render();
            },500);
        });
    },
    importExcel: function(){
        var files = electron.remote.dialog.showOpenDialog();
        if(files && files.length){
            var objData = importApbdes(files[0]);
            var data = objData.map(o => schemas.objToArray(o, schemas.apbdes));

            hot.loadData(data);
            setTimeout(function(){
                hot.render();
            },500);
        }
    },
    exportExcel: function(){
        var data = hot.getSourceData();
        exportApbdes(data, "Apbdes");
    },
    openAddRowDialog: function(){
        $("#modal-add").modal("show");
        setTimeout(function(){
            hot.unlisten();
            $("input[name='account_code']").focus();
        }, 500);
    },
    addRow: function(){
        var data = $("#form-add").serializeArray().map(i => i.value);
        var sourceData = hot.getSourceData();
        var position = 0;
        for(;position < sourceData.length; position++){
            if(isCodeLesserThan(data[0], sourceData[position][0]))
                break;
        }
        hot.alter("insert_row", position);
        hot.populateFromArray(position, 0, [data], position, 3, null, 'overwrite');
        hot.selection.setRangeStart(new WalkontableCellCoords(position,0));
        hot.selection.setRangeEnd(new WalkontableCellCoords(position,3));
        $('#form-add')[0].reset();
    },
    addOneRow: function(){
        this.addRow();
        $("#modal-add").modal("hide");
    },
    addOneRowAndAnother: function(){
        var code = $("input[name='account_code']").val();
        this.addRow();
        $("input[name='account_code']").focus().val(code).select();
        return false;
    },
    openNewSubTypeDialog: function(){
        $("#modal-new-year").modal("show");
        setTimeout(function(){
            hot.unlisten();
            $("input[name='year']").focus();
        }, 500);
    },
    createNewSubType: function(){
        var year = $("#form-new-year input[name='year']").val();
        var is_perubahan = $("#form-new-year input[name='is_perubahan']")[0].checked;
        console.log(is_perubahan);
        var subType = year;
        if(is_perubahan)
            subType = subType+"p";
        this.activeSubType = subType;
        this.subTypes.push(subType);
        hot.loadData(createDefaultApbdes());
        $("#modal-new-year").modal("hide");
        return false;
    },
    saveSubType: function(){
        var timestamp = new Date().getTime();
        var content = {
            timestamp: timestamp,
            data: hot.getSourceData()
        };
        
        dataapi.saveContent("apbdes", this.activeSubType, content, function(err, response, body){
        });
    }
});

var ApbdesModule$1 = window.ApbdesModule = _angular_core.NgModule({
    imports: [ _angular_platformBrowser.BrowserModule ],
    declarations: [ApbdesComponent, UndoRedoComponent, OnlineStatusComponent],
    bootstrap: [ApbdesComponent]
})
.Class({
    constructor: function() {
        console.log("init module");
    }
});

document.addEventListener('DOMContentLoaded', function () {
    _angular_platformBrowserDynamic.platformBrowserDynamic().bootstrapModule(ApbdesModule$1);
});

moment.locale("id");

var printvars = {
    desa: "Fulur",
    kecamatan: "Lamaknen",
    kabupaten: "Belu",
    provinsi: "Nusa Tenggara Timur",
    tahun: 2016,
    tanggal: moment().format("LL"),
    jabatan: "Sekdes",
    nama: "",

    
};

// native electron module
// module loaded from npm
var Handsontable$3 = require('./handsontablep/dist/handsontable.full.js');
window.jQuery = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

var app$2 = electron.remote.app;
var hot$1;
var sheetContainer$1;
var emptyContainer;
var resultBefore=[];

var init$1 =  function () {    
    initializeOnlineStatusImg($(".navbar-brand img")[0]);
    sheetContainer$1 = document.getElementById('sheet');
    emptyContainer = document.getElementById('empty');
    window.hot = hot$1 = new Handsontable$3(sheetContainer$1, {
        data: [],
        topOverlay: 34,

        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.penduduk),
        columns: schemas.penduduk,

        colWidths: schemas.getColWidths(schemas.penduduk),
        rowHeights: 23,
        
        columnSorting: true,
        sortIndicator: true,
        hiddenColumns: {indicators: true},
        
        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,
        search: true,
        filters: true,
        contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
        dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
    });

    var formSearch = document.getElementById("form-search");
    var inputSearch = document.getElementById("input-search");
    initializeTableSearch(hot$1, document, formSearch, inputSearch);
    
    var spanSelected = $("#span-selected")[0];
    initializeTableSelected(hot$1, 1, spanSelected);
    
    var spanCount = $("#span-count")[0];
    initializeTableCount(hot$1, spanCount);

    window.addEventListener('resize', function(e){
        hot$1.render();
    })
};
var showColumns = [      
        [],
        ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","pekerjaan","kewarganegaraan","rt","rw","nama_dusun","agama","alamat_jalan"],
        ["nik","nama_penduduk","no_telepon","email","rt","rw","nama_dusun","alamat_jalan"],
        ["nik","nama_penduduk","tempat_lahir","tanggal_lahir","jenis_kelamin","nama_ayah","nama_ibu","hubungan_keluarga","no_kk"],
        ["nik","nama_penduduk","kompetensi","pendidikan","pekerjaan","pekerjaan_ped"]
    ];

var spliceArray = function(fields, showColumns){
    var result=[];
    for(var i=0;i!=fields.length;i++){
        var index = showColumns.indexOf(fields[i]);
        if (index == -1) result.push(i);
    }
    return result;
}

var PendudukComponent = _angular_core.Component({
    selector: 'penduduk',
    templateUrl: 'templates/penduduk.html'
})
.Class({
    constructor: function() {
    },
    ngOnInit: function(){
        $("title").html("Data Penduduk - " +dataapi.getActiveAuth().desa_name);
        init$1(); 
        this.hot = window.hot;
        dataapi.getContent("penduduk", null, {data: []}, function(content){        
            var initialData = content.data;
            hot$1.loadData(initialData);
            //hot.loadData(initialData.concat(initialData).concat(initialData).concat(initialData));
            if(initialData.length == 0)
                $(emptyContainer).removeClass("hidden");
            else 
                $(sheetContainer$1).removeClass("hidden");
            setTimeout(function(){
                hot$1.render();
            },500);
        })
    },
    importExcel: function(){
        var files = electron.remote.dialog.showOpenDialog();
        if(files && files.length){
            var objData = importPenduduk(files[0]);
            var data = objData.map(o => schemas.objToArray(o, schemas.penduduk));

            hot$1.loadData(data);
            $(emptyContainer).addClass("hidden");
            $(sheetContainer$1).removeClass("hidden");
            setTimeout(function(){
                hot$1.render();
            },500);
        }
    },
    exportExcel : function(){        
        var data = hot$1.getSourceData();
        exportPenduduk(data, "Data Penduduk");
    }, 
    filterContent : function(){ 
        var plugin = hot$1.getPlugin('hiddenColumns');        
        var value = $('input[name=btn-filter]:checked').val();   
        var fields = schemas.penduduk.map(c => c.field);
        var result = spliceArray(fields,showColumns[value]);

        plugin.showColumns(resultBefore);
        if(value==0)plugin.showColumns(result);
        else plugin.hideColumns(result);
        hot$1.render();
        resultBefore = result;
    },
    insertRow : function(){
        $(emptyContainer).addClass("hidden");
        $(sheetContainer$1).removeClass("hidden");
        hot$1.alter("insert_row", 0);
        hot$1.selectCell(0, 0, 0, 0, true);
    },
    saveContent:  function(){
        $(".alert").removeClass("hidden").html("Menyimpan...");
        var timestamp = new Date().getTime();
        var content = {
            timestamp: timestamp,
            data: hot$1.getSourceData()
        };
        
        dataapi.saveContent("penduduk", null, content, function(err, response, body){
            $(".alert").html("Penyimpanan "+ (err ? "gagal" : "berhasil"));
            setTimeout(function(){
                $(".alert").addClass("hidden");
            }, 2000);
        });
    },
    printSurat: function(){
        var selected = hot$1.getSelected();
        if(!selected)
            return;
        var fileName = electron.remote.dialog.showSaveDialog({
            filters: [
                {name: 'Word document', extensions: ['docx']},
            ]
        });
        if(fileName){
            if(!fileName.endsWith(".docx"))
                fileName = fileName+".docx";

            var angularParser= function(tag){
                var expr=expressions.compile(tag);
                return {get:expr};
            }
            var nullGetter = function(tag, props) {
                return "";
            };
            var penduduk = schemas.arrayToObj(hot$1.getDataAtRow(selected[0]), schemas.penduduk);
            var content = fs.readFileSync(path.join(app$2.getAppPath(), "docx_templates","surat.docx"),"binary");
            var doc=new Docxtemplater(content);
            doc.setOptions({parser:angularParser, nullGetter: nullGetter});
            doc.setData({penduduk: penduduk, vars: printvars});
            doc.render();

            var buf = doc.getZip().generate({type:"nodebuffer"});
            fs.writeFileSync(fileName, buf);
            electron.shell.openItem(fileName);
        }
    }
});

var PendudukModule = window.PendudukModule = _angular_core.NgModule({
    imports: [ _angular_platformBrowser.BrowserModule ],
    declarations: [PendudukComponent, UndoRedoComponent, OnlineStatusComponent],
    bootstrap: [PendudukComponent]
})
.Class({
    constructor: function() {
        console.log("init module");
    }
});

document.addEventListener('DOMContentLoaded', function () {
    _angular_platformBrowserDynamic.platformBrowserDynamic().bootstrapModule(PendudukModule);
});

// native electron module
// module loaded from npm
var Handsontable$4 = require('./handsontablep/dist/handsontable.full.js');
window.jQuery = $;
require('./node_modules/bootstrap/dist/js/bootstrap.js');

var app$3 = electron.remote.app;
var hot$2;
var sheetContainer$2;
var emptyContainer$1;
var resultBefore$1=[];

var init$2 =  function () {
    initializeOnlineStatusImg($(".navbar-brand img")[0]);
    sheetContainer$2 = document.getElementById('sheet');
    emptyContainer$1 = document.getElementById('empty');
    window.hot = hot$2 = new Handsontable$4(sheetContainer$2, {
        data: [],
        topOverlay: 34,

        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.keluarga),
        columns: schemas.keluarga,

        colWidths: schemas.getColWidths(schemas.keluarga),
        rowHeights: 23,

        columnSorting: true,
        sortIndicator: true,        
        hiddenColumns: {indicators: true},

        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,

        search: true,
        filters: true,        
        contextMenu: ['undo', 'redo', 'row_above', 'remove_row'],
        dropdownMenu: ['filter_by_condition', 'filter_action_bar']
    });

    var formSearch = document.getElementById("form-search");
    var inputSearch = document.getElementById("input-search");
    initializeTableSearch(hot$2, document, formSearch, inputSearch);
    
    var spanSelected = $("#span-selected")[0];
    initializeTableSelected(hot$2, 1, spanSelected);
    
    var spanCount = $("#span-count")[0];
    initializeTableCount(hot$2, spanCount);

    window.addEventListener('resize', function(e){
        hot$2.render();
    })
};

var showColumns$1 = [      
    [],
    ["no_kk","nama_kepala_keluarga","alamat","dusun","rt","rw"],        
    ["no_kk","nama_kepala_keluarga","raskin","jamkesmas","pkh"]
]

var spliceArray$1 = function(fields, showColumns){
    var result=[];
    for(var i=0;i!=fields.length;i++){
        var index = showColumns.indexOf(fields[i]);
        if (index == -1) result.push(i);
    }
    return result;
}

var allPenduduks = {};
var updateKeluarga = function(keluargas, penduduks){
    var existsKeluargas = {};
    var keluargaMap = {};
    for(var i = 0; i < keluargas.length; i++){
        var k = keluargas[i];
        existsKeluargas[k[0]] = true;
        keluargaMap[k[0]] = k;
    }

    for(var i = 0; i < penduduks.length; i++){
        var p = penduduks[i];
        var po = schemas.arrayToObj(p, schemas.penduduk);
        if(!po.no_kk)
            continue;
            
        if(!existsKeluargas[po.no_kk]){
            var ko = {no_kk: po.no_kk, raskin: null, jamkesmas: null, pkh: null};
            var k = schemas.objToArray(ko, schemas.keluarga);
            keluargas.push(k);
            keluargaMap[po.no_kk] = k;
            existsKeluargas[po.no_kk] = true;
        }
        
        if(!allPenduduks[po.no_kk]){
            allPenduduks[po.no_kk] = [];
        }
        allPenduduks[po.no_kk].push(po)

        if(po.hubungan_keluarga == "Kepala Keluarga"){
            keluargaMap[po.no_kk][1] = po.nama_penduduk;
            keluargaMap[po.no_kk][2] = po.nik;
        }
    }
    
    for(var i = 0; i < keluargas.length; i++){
        var k = keluargas[i];
        var count = 0;
        if(allPenduduks[k[0]])
            count = allPenduduks[k[0]].length;
        k[3] = count;
    }
    
}

var KeluargaComponent = _angular_core.Component({
    selector: 'keluarga',
    templateUrl: 'templates/keluarga.html'
})
.Class({
    constructor: function() {
    },
    ngOnInit: function(){        
        $("title").html("Data Keluarga - " +dataapi.getActiveAuth().desa_name);
        init$2();
        this.hot = window.hot;
        dataapi.getContent("keluarga", null, {data: []}, function(keluargaContent){
            dataapi.getContent("penduduk", null, {data: []}, function(pendudukContent){
                updateKeluarga(keluargaContent.data, pendudukContent.data);
                hot$2.loadData(keluargaContent.data);
                setTimeout(function(){
                    hot$2.render();
                },500);
            })
        })
    },    
    exportExcel: function(){
        var data = hot$2.getSourceData();
        exportKeluarga(data, "Data Keluarga");
    },
    filterContent: function(){    
        var plugin = hot$2.getPlugin('hiddenColumns');     
        var value = $('input[name=btn-filter]:checked').val();   
        var fields = schemas.keluarga.map(c => c.field);
        var result = spliceArray$1(fields,showColumns$1[value]);

        plugin.showColumns(resultBefore$1);
        if(value==0) plugin.showColumns(result);
        else plugin.hideColumns(result);
        hot$2.render();
        resultBefore$1 = result;
    },
    saveContent: function(){
        var timestamp = new Date().getTime();
        var content = {
            timestamp: timestamp,
            data: hot$2.getSourceData()
        };
        //disable save for now
        //dataapi.saveContent("keluarga", null, content);
    },     
    printKK: function(){
        var selected = hot$2.getSelected();
        if(!selected)
            return;
            
        var fileName = electron.remote.dialog.showSaveDialog({
            filters: [
                {name: 'Word document', extensions: ['docx']},
            ]
        });
        if(fileName){
            if(!fileName.endsWith(".docx"))
                fileName = fileName+".docx";
            var angularParser= function(tag){
                var expr=expressions.compile(tag);
                return {get:expr};
            }
            var nullGetter = function(tag, props) {
                return "";
            };
            var no_kk = hot$2.getDataAtRow(selected[0])[0];
            var rawPenduduks = allPenduduks[no_kk];
            var idx = 1;
            var penduduks = rawPenduduks.map(function(o){
                var res = Object.assign({}, o);
                res.no = idx;
                idx++;
                return res;
            });
            var content = fs.readFileSync(path.join(app$3.getAppPath(), "docx_templates","kk.docx"),"binary");
            var doc=new Docxtemplater(content);
            doc.setOptions({parser:angularParser, nullGetter: nullGetter});
            doc.setData({penduduks: penduduks, vars: printvars, no_kk: no_kk});
            doc.render();

            var buf = doc.getZip().generate({type:"nodebuffer"});
            fs.writeFileSync(fileName, buf);
            electron.shell.openItem(fileName);
        }
    }
});

var KeluargaModule = window.KeluargaModule = _angular_core.NgModule({
    imports: [ _angular_platformBrowser.BrowserModule ],
    declarations: [KeluargaComponent, UndoRedoComponent, OnlineStatusComponent],
    bootstrap: [KeluargaComponent]
})
.Class({
    constructor: function() {
        console.log("init module");
    }
});

document.addEventListener('DOMContentLoaded', function () {
    _angular_platformBrowserDynamic.platformBrowserDynamic().bootstrapModule(KeluargaModule);
});

var SidekaModule = _angular_core.NgModule({
    imports: [ 
        _angular_platformBrowser.BrowserModule,
        _angular_router.RouterModule.forRoot([
            { path: 'penduduk', component: PendudukComponent },
            { path: 'keluarga', component: KeluargaComponent },
            { path: 'apbdes', component: ApbdesComponent },
            { path: '', component: PendudukComponent },
        ]),
    ],
    declarations: [
        ApbdesComponent, 
        KeluargaComponent, 
        PendudukComponent, 
        UndoRedoComponent, 
        OnlineStatusComponent
    ],
    bootstrap: [ApbdesComponent]
})
.Class({
    constructor: function() {
        console.log("init module");
    }
});

document.addEventListener('DOMContentLoaded', function () {
    _angular_platformBrowserDynamic.platformBrowserDynamic().bootstrapModule(ApbdesModule);
});
}());
//# sourceMappingURL=main.js.map