(function () {'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var os = require('os');
var path = _interopDefault(require('path'));
var fs = _interopDefault(require('fs'));
var $ = _interopDefault(require('jquery'));
var electron = require('electron');
var jetpack = _interopDefault(require('fs-jetpack'));
var Docxtemplater = _interopDefault(require('docxtemplater'));
var XLSX = _interopDefault(require('xlsx'));
var d3 = _interopDefault(require('d3'));
var request = _interopDefault(require('request'));

// Simple wrapper exposing environment variables to rest of the code.

// The variables have been written to `env.json` by the build process.
var env = jetpack.cwd(__dirname).read('env.json', 'json');

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

// module loaded from npm

var SERVER = "http://10.10.10.107:5000";
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
    
    getContent: function(type, defaultValue, callback){
        var fileName = path.join(CONTENT_DIR, type+".json");
        var fileContent = defaultValue;
        var timestamp = 0;
        var auth = this.getActiveAuth();

        if(jetpack.exists(fileName)){
            fileContent =  JSON.parse(jetpack.read(fileName));
            timestamp = fileContent.timestamp;
        }
        request({
            url: SERVER+"/content/"+auth.desa_id+"/"+type,
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
    
    saveContent: function(type, content){
        var fileName = path.join(CONTENT_DIR, type+".json");
        jetpack.write(fileName, JSON.stringify(content));
        var auth = this.getActiveAuth();
        request({
            url: SERVER+"/content/"+auth.desa_id+"/"+type,
            method: "POST",
            headers: {
                "X-Auth-Token": auth.token.trim()
            },
            json: content
        }, function(err, response, body){
            if(!response || response.statusCode != 200) {
                //todo, save later
            } 
        });
    }
    
    
}

var pendudukSchema = [
    {
        header: 'NIK',
        field: 'nik', 
        type: 'text'
    },
    {
        header: 'Nama Penduduk',
        field: 'nama_penduduk', 
        type: 'text'
    },
    {
        header: 'Tempat Lahir',
        field: 'tempat_lahir', 
        type: 'text'
    },
    {
        header: 'Tanggal Lahir',
        field: 'tanggal_lahir', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        correctFormat: true,
        defaultDate: '01/01/1900'
    },
    {
        header: 'Jenis Kelamin',
        field: 'jenis_kelamin',
        type: 'dropdown',
        source: ['Laki - laki', 'Perempuan']
    },
    {
        header: 'Pendidikan',
        field: 'pendidikan', 
        type: 'dropdown',
        source: ['Tidak Pernah Sekolah', 'Tidak dapat membaca' ,'Belum Masuk TK/PAUD', 'Sedang SD/Sederajat', 'Tamat SD/Sederajat', 
        'Sedang SMP/Sederajat', 'Tamat SMP/Sederajat', 'Sedang SMA/Sederajat', 'Tamat SMA/Sederajat',
        'Sedang D-3/Sederajat', 'Tamat D-3/Sederajat', 'Sedang S-1/Sederajat', 'Tamat S-1/Sederajat', 
        'Sedang S-2/Sederajat', 'Tamat S-2/Sederajat', 'Sedang S-3/Sederajat', 'Tamat S-3/Sederajat', 
        'Tidak Diketahui']

    },
    {
        header: 'Agama',
        field: 'agama', 
        type: 'dropdown',
        source: ['Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Konghuchu', 
        'Aliran Kepercayaan Kepada Tuhan YME', 'Aliran Kepercayaan Lainnya', 'Tidak Diketahui']
    },
    {   
        header: 'Status Kawin',
        field: 'status_kawin', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati']
    },
    {
        header: 'Pekerjaan',
        field: 'pekerjaan', 
        type: 'dropdown',
        source: ["Tidak Diketahui","BELUM/TIDAK BEKERJA","MENGURUS RUMAH TANGGA","PELAJAR/MAHASISWA","PENSIUNAN","PEGAWAI NEGERI SIPIL (PNS)","TENTARA NASIONAL INDONESIA (TNI)","KEPOLISIAN RI ","PERDAGANGAN","PETANI/PEKEBUN","PETERNAK","NELAYAN/PERIKANAN","INDUSTRI","KONSTRUKSI","TRANSPORTASI","KARYAWAN SWASTA","KARYAWAN BUMN","KARYAWAN HONORER","BURUH HARIAN LEPAS","BURUH TANI/PERKEBUNAN","BURUH NELAYAN/PERIKANAN","BURUH PETERNAKAN","PEMBANTU RUMAH TANGGA","TUKANG CUKUR","TUKANG BATU","TUKANG LISTRIK","TUKANG KAYU","TUKANG SOL SEPATU","TUKANG LAS/PANDAI BESI","TUKANG JAIT","TUKANG GIGI","PENATA RIAS","PENATA BUSANA","PENATA RAMBUT","MEKANIK","SENIMAN","TABIB","PARAJI","PERANCANG BUSANA","PENTERJEMAH","IMAM MASJID","PENDETA","PASTOR","WARTAWAN","USTADZ/MUBALIGH","JURU MASAK","PROMOTOR ACARA","ANGGOTA DPR RI","ANGGOTA DPD","ANGGOTA BPK","PRESIDEN","WAKIL PRESIDEN","ANGGOTA MAHKAMAH KONSTITUSI","DUTA BESAR","GUBERNUR","WAKIL GUBERNUR","BUPATI","WAKIL BUPATI","WALIKOTA","WAKIL WALIKOTA","ANGGOTA DPRD PROP","ANGGOTA DPRD KAB. KOTA","DOSEN","GURU","PILOT","PENGACARA","NOTARIS","ARSITEK","AKUNTAN","KONSULTAN","DOKTER","BIDAN","PERAWAT","APOTEKER","PSIKIATER/PSIKOLOG","PENYIAR TELEVISI","PENYIAR RADIO","PELAUT","PENELITI","SOPIR","PIALANG","PARANORMAL","PEDAGANG","PERANGKAT DESA","KEPALA DESA","BIARAWATI","WIRASWASTA","BURUH MIGRAN"]
    },
    {
        header: 'Pekerjaan PED',
        field: 'pekerjaan_ped', 
        type: 'dropdown',
        source: ["Tidak Diketahui","Tidak Diketahui","Petani","Pedagang","Petani Kebun","Tukang Batu / Jasa Lainnya","Seniman"]
    },
    {
        header: 'Kewarganegaraan',
        field: 'kewarganegaraan', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'WNI', 'WNA', 'DWIKEWARGANEGARAAN']
    },
    {
        header: 'Kompetensi',
        field: 'kompetensi', 
        type: 'dropdown',
        source: ["Tidak Diketahui","Kesehatan","Profesional Bangunan","Profesional Kelistrikan","Profesional Pendidikan"]
    },
    {
        header: 'No Telepon',
        field: 'no_telepon', 
        type: 'text'
    },
    {
        header: 'Email',
        field: 'email', 
        type: 'text'
    },
    {   
        header: 'No Kitas',
        field: 'no_kitas', 
        type: 'text'
    },
    {
        header: 'No Paspor',
        field: 'no_paspor', 
        type: 'text'
    },
    {
        header: 'Golongan Darah',
        field: 'golongan_darah', 
        type: 'dropdown',
        source: ['A', 'A+', 'A-', 'B', 'B+', 'B-', 'AB', 'AB+', 'AB-', 'O', 'O+', 'O-', 'Tidak Diketahui']
    },
    {
        header: 'RT',
        field: 'rt', 
        type: 'text'
    },
    {   
        header: 'RW',
        field: 'rw', 
        type: 'text'
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
        source: ['Tidak diketahui', 'Tinggal Tetap', 'Meninggal', 'Pindahan Keluar', 'Pindahan Masuk']
    },
    {   
        header: 'Status Tinggal',
        field: 'status_tinggal', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Tinggal Tetap', 'Tinggal di luar desa (dalam 1 kab/kota)',
        'Tinggal di luar kota','Tinggal di luar provinsi','Tinggal di luar negeri']
    },
    {
        header: 'Kontrasepsi',
        field: 'kontrasepsi', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Pil', 'Suntik', 'IUD', 'Kondom', 'Implant', 'MOP', 'MOW']
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

var schemas = {
    penduduk: pendudukSchema,
    getHeader: function(schema){
        return schema.map(function(c){return c.header});
    },
    objToArray: function(obj, schema){
        return obj.map(function(source){
            var result = [];
            for(var i = 0; i < schema.length; i++){
                result.push(source[schema[i].field]);
            }
            return result;
        });
    },
    arrayToObj: function(arr, schema){
        return arr.map(function(source){
            var result = {};
            for(var i = 0; i < schema.length; i++){
                result[schema[i].field] = source[i];
            }
            return result;
        });
    }
};

// native node.js module
// native electron module
// module loaded from npm
var Handsontable = require('./handsontablep/dist/handsontable.full.js');
console.log('Loaded environment variables:', env);

var app = electron.remote.app;
var appDir = jetpack.cwd(app.getAppPath());
var hot;
var sheetContainer;
var emptyContainer;

document.addEventListener('DOMContentLoaded', function () {
    $("title").html("Data Penduduk - " +dataapi.getActiveAuth().desa_name);

    sheetContainer = document.getElementById('sheet');
    emptyContainer = document.getElementById('empty');
    hot = new Handsontable(sheetContainer, {
        data: [],
        rowHeaders: true,
        topOverlay: 34,
        renderAllRows: false,
        columnSorting: true,
        sortIndicator: true,
        colHeaders: schemas.getHeader(schemas.penduduk),
        columns: schemas.penduduk,
        fixedColumnsLeft: 2,
        search: true,
        filters: true,
        contextMenu: ['row_above', 'remove_row'],
        dropdownMenu: ['filter_by_condition', 'filter_action_bar']
    });
    
    var searchField = document.getElementById('search-field');
    Handsontable.Dom.addEvent(searchField, 'keyup', function(event) {
        console.log(this.value);
        var queryResult = hot.search.query(this.value);
        hot.render();
    });
    var searchForm = document.getElementById('search-form');
    searchForm.onsubmit = function(){
        return false;
    };
    
    var importExcel = function(){
        var files = electron.remote.dialog.showOpenDialog();
        if(files && files.length){
            var objData = importPenduduk(files[0]);
            var data = schemas.objToArray(objData, schemas.penduduk);

            hot.loadData(data);
            $(emptyContainer).addClass("hide");
            $(sheetContainer).removeClass("hide");
            setTimeout(function(){
                hot.render();
            },500);
        }
    }
    document.getElementById('open-btn').onclick = importExcel;
    document.getElementById('open-btn-empty').onclick = importExcel;

    document.getElementById('save-btn').onclick = function(){
        var timestamp = new Date().getTime();
        var content = {
            timestamp: timestamp,
            data: hot.getData()
        };
        dataapi.saveContent("penduduk", content);
    };

    document.getElementById('mail-btn').onclick = function(){
        var fileName = electron.remote.dialog.showSaveDialog();
        if(fileName){
            var penduduk = schemas.arrayToObj([hot.getData()[0]], schemas.penduduk)[0];
            var content = fs.readFileSync(path.join(app.getAppPath(),"surat.docx"),"binary");
            var doc=new Docxtemplater(content);
            doc.setData(penduduk);
            doc.render();

            var buf = doc.getZip().generate({type:"nodebuffer"});
            fs.writeFileSync(fileName, buf);
            electron.shell.openItem(fileName);
        }
    };
    
    
    window.addEventListener('resize', function(e){
        hot.render();
    })
    
    dataapi.getContent("penduduk", {data: []}, function(content){
        var initialData = content.data;
        hot.loadData(initialData);
        if(initialData.length == 0)
        {
            $(emptyContainer).removeClass("hide");
        }
        else 
        {
            $(sheetContainer).removeClass("hide");
        }
        setTimeout(function(){
            hot.render();
        },500);
    })
    
});
}());
//# sourceMappingURL=kependudukan.js.map