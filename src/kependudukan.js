// Here is the starting point for your application code.
// All stuff below is just to show you how it works. You can delete all of it.

// Use new ES6 modules syntax for everything.
import os from 'os'; // native node.js module
import jQuery from 'jquery';
import { remote } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
var Handsontable = require('./handsontable/dist/handsontable.full.js');
import env from './env';
import { importPenduduk } from './importer/penduduk';

console.log('Loaded environment variables:', env);

var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());
var hot;
var sheetContainer;
var emptyContainer;
var initialData = [];

// Holy crap! This is browser window with HTML and stuff, but I can read
// here files like it is node.js! Welcome to Electron world :)
console.log('The author of this app is:', appDir.read('package.json', 'json').author);


document.addEventListener('DOMContentLoaded', function () {
    sheetContainer = document.getElementById('sheet');
    emptyContainer = document.getElementById('empty');
    hot = new Handsontable(sheetContainer, {
        data: initialData,
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
    
    var importExcel = function(){
        var files = remote.dialog.showOpenDialog();
        if(files && files.length){
            var data = importPenduduk(files[0]);
            hot.loadData(data);
            jQuery(emptyContainer).addClass("hide");
            jQuery(sheetContainer).removeClass("hide");
            setTimeout(function(){
                hot.render();
            },500);
        }
    }

    document.getElementById('open-btn').onclick = importExcel;
    document.getElementById('open-btn-empty').onclick = importExcel;
    
    if(initialData.length == 0)
    {
        jQuery(emptyContainer).removeClass("hide");
    }
    else 
    {
        jQuery(sheetContainer).removeClass("hide");
    }
    
});
