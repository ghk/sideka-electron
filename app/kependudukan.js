(function () {'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var os = require('os');
var electron = require('electron');
var jetpack = _interopDefault(require('fs-jetpack'));
var XLSX = _interopDefault(require('xlsx'));
var d3 = _interopDefault(require('d3'));

// Simple wrapper exposing environment variables to rest of the code.

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
    getset(source, result, "Nik", "nik", function(s){return s.replace(new RegExp('\\.', 'g'), "")});
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
        "No KK",
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

// Here is the starting point for your application code.
// All stuff below is just to show you how it works. You can delete all of it.

// Use new ES6 modules syntax for everything.
var Handsontable = require('./handsontable/dist/handsontable.full.js');
console.log('Loaded environment variables:', env);

var app = electron.remote.app;
var appDir = jetpack.cwd(app.getAppPath());
var hot;

// Holy crap! This is browser window with HTML and stuff, but I can read
// here files like it is node.js! Welcome to Electron world :)
console.log('The author of this app is:', appDir.read('package.json', 'json').author);


document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('sheet');
    hot = new Handsontable(container, {
        data: [],
        rowHeaders: true,
        topOverlay: 34,
        renderAllRows: false,
        columnSorting: true,
        sortIndicator: true,
        colHeaders: [
              'NIK',
              'Nama Penduduk',
              'Tempat Lahir',
              'Tanggal Lahir',
              'Jenis Kelamin',
              'Pendidikan',
              'Agama',
              'Status Kawin',
              'Pekerjaan',
              'Pekerjaan PED',
              'Kewarganegaraan',
              'Kompetensi',
              'No Telp',
              'Email',
              'No Kitas',
              'No Paspor',
              'Golongan Darah',
              'RT',
              'RW',
              'Nama Dusun',
              'Status Penduduk',
              'Status Tinggal',
              'Difabilitas',
              'Kontrasepsi',
              'No KK',
              'Alamat Jalan',
              'Nama Ayah',
              'Nama Ibu',
              'Status Keluarga',
          ],
          columns: [
            {data: 'nik', type: 'text'},
            {data: 'nama_penduduk', type: 'text'},
            {data: 'tempat_lahir', type: 'text'},
            {
                data: 'tanggal_lahir', 
                type: 'date',
                dateFormat: 'DD/MM/YYYY',
                correctFormat: true,
                defaultDate: '01/01/1900'
            },
            {
                data: 'jenis_kelamin',
                type: 'dropdown',
                source: ['Laki - laki', 'Perempuan']
            },
            {
                data: 'pendidikan', type: 'dropdown',
                source: ['Tidak Pernah Sekolah', 'Tidak dapat membaca' ,'Belum Masuk TK/PAUD', 'Sedang SD/Sederajat', 'Tamat SD/Sederajat', 
                'Sedang SMP/Sederajat', 'Tamat SMP/Sederajat', 'Sedang SMA/Sederajat', 'Tamat SMA/Sederajat',
                'Sedang D-3/Sederajat', 'Tamat D-3/Sederajat', 'Sedang S-1/Sederajat', 'Tamat S-1/Sederajat', 
                'Sedang S-2/Sederajat', 'Tamat S-2/Sederajat', 'Sedang S-3/Sederajat', 'Tamat S-3/Sederajat', 
                'Tidak Diketahui']

            },
            {
                data: 'agama', type: 'dropdown',
                source: ['Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Konghuchu', 
                'Aliran Kepercayaan Kepada Tuhan YME', 'Aliran Kepercayaan Lainnya', 'Tidak Diketahui']
            },
            {   
                data: 'status_kawin', type: 'dropdown',
                source: ['Tidak Diketahui', 'Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati']
            },
            {data: 'pekerjaan', type: 'text'},
            {data: 'pekerjaan_ped', type: 'text'},
            {data: 'kewarganegaraan', type: 'text'},
            {data: 'kompetensi', type: 'text'},
            {data: 'no_telepon', type: 'text'},
            {data: 'email', type: 'text'},
            {data: 'no_kitas', type: 'text'},
            {data: 'no_paspor', type: 'text'},
            {data: 'golongan_darah', type: 'text'},
            {data: 'rt', type: 'text'},
            {data: 'rw', type: 'text'},
            {data: 'nama_dusun', type: 'text'},
            {data: 'status_penduduk', type: 'text'},
            {data: 'status_tinggal', type: 'text'},
            {data: 'difabilitas', type: 'text'},
            {data: 'no_kk', type: 'text'},
            {data: 'alamat_jalan', type: 'text'},
            {data: 'nama_ayah', type: 'text'},
            {data: 'nama_ibu', type: 'text'},
            {data: 'hubungan_keluarga', type: 'text'},
          ],
          fixedColumnsLeft: 2,
          search: true,
          filters: true,
          dropdownMenu: ['filter_by_condition', 'filter_action_bar']
    });
    function getRowsFromObjects(queryResult) {
        var rows = [];
        for (var i = 0, l = queryResult.length; i < l; i++) {
            rows.push(queryResult[i].row);
        }
        return rows;
    }
    var searchField = document.getElementById('search-field');
    Handsontable.Dom.addEvent(searchField, 'keyup', function(event) {
        console.log(this.value);
        var queryResult = hot.search.query(this.value);
        hot.render();
        /*
        var rows = getRowsFromObjects(queryResult);

        var filtered = penduduk.filter(function(_, index) {
            return !searchField.value || rows.indexOf(index) >= 0;
        });

        hot.loadData(filtered);
        */
    });
    window.addEventListener('resize', function(e){
        hot.render();
    })
    var searchForm = document.getElementById('search-form');
    searchForm.onsubmit = function(){
        return false;
    };

    var openBtn = document.getElementById('open-btn');
    openBtn.onclick = function(){
        var files = electron.remote.dialog.showOpenDialog();
        if(files && files.length){
            hot.loadData(importPenduduk(files[0]));
            hot.render();
        }
    };
    
});
}());
//# sourceMappingURL=kependudukan.js.map