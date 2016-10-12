// Here is the starting point for your application code.
// All stuff below is just to show you how it works. You can delete all of it.

// Use new ES6 modules syntax for everything.
import os from 'os'; // native node.js module
import $ from 'jquery';
import { remote, app } from 'electron'; // native electron module
import jetpack from 'fs-jetpack'; // module loaded from npm
var Handsontable = require('./handsontable/dist/handsontable.full.js');
import env from './env';
import { importPenduduk } from './importer/penduduk';
import dataapi from './dataapi/dataapi';

console.log('Loaded environment variables:', env);

var app = remote.app;
var appDir = jetpack.cwd(app.getAppPath());
var hot;
var sheetContainer;
var emptyContainer;

// Holy crap! This is browser window with HTML and stuff, but I can read
// here files like it is node.js! Welcome to Electron world :)
console.log('The author of this app is:', appDir.read('package.json', 'json').author);


document.addEventListener('DOMContentLoaded', function () {

    sheetContainer = document.getElementById('sheet');
    emptyContainer = document.getElementById('empty');
    hot = new Handsontable(sheetContainer, {
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
            {field: 'nik', type: 'text'},
            {field: 'nama_penduduk', type: 'text'},
            {field: 'tempat_lahir', type: 'text'},
            {
                field: 'tanggal_lahir', 
                type: 'date',
                dateFormat: 'DD/MM/YYYY',
                correctFormat: true,
                defaultDate: '01/01/1900'
            },
            {
                field: 'jenis_kelamin',
                type: 'dropdown',
                source: ['Laki - laki', 'Perempuan']
            },
            {
                field: 'pendidikan', type: 'dropdown',
                source: ['Tidak Pernah Sekolah', 'Tidak dapat membaca' ,'Belum Masuk TK/PAUD', 'Sedang SD/Sederajat', 'Tamat SD/Sederajat', 
                'Sedang SMP/Sederajat', 'Tamat SMP/Sederajat', 'Sedang SMA/Sederajat', 'Tamat SMA/Sederajat',
                'Sedang D-3/Sederajat', 'Tamat D-3/Sederajat', 'Sedang S-1/Sederajat', 'Tamat S-1/Sederajat', 
                'Sedang S-2/Sederajat', 'Tamat S-2/Sederajat', 'Sedang S-3/Sederajat', 'Tamat S-3/Sederajat', 
                'Tidak Diketahui']

            },
            {
                field: 'agama', type: 'dropdown',
                source: ['Islam', 'Kristen', 'Katholik', 'Hindu', 'Budha', 'Konghuchu', 
                'Aliran Kepercayaan Kepada Tuhan YME', 'Aliran Kepercayaan Lainnya', 'Tidak Diketahui']
            },
            {   
                field: 'status_kawin', type: 'dropdown',
                source: ['Tidak Diketahui', 'Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati']
            },
            {
                field: 'pekerjaan', type: 'dropdown',
                source: ["Tidak Diketahui","BELUM/TIDAK BEKERJA","MENGURUS RUMAH TANGGA","PELAJAR/MAHASISWA","PENSIUNAN","PEGAWAI NEGERI SIPIL (PNS)","TENTARA NASIONAL INDONESIA (TNI)","KEPOLISIAN RI ","PERDAGANGAN","PETANI/PEKEBUN","PETERNAK","NELAYAN/PERIKANAN","INDUSTRI","KONSTRUKSI","TRANSPORTASI","KARYAWAN SWASTA","KARYAWAN BUMN","KARYAWAN HONORER","BURUH HARIAN LEPAS","BURUH TANI/PERKEBUNAN","BURUH NELAYAN/PERIKANAN","BURUH PETERNAKAN","PEMBANTU RUMAH TANGGA","TUKANG CUKUR","TUKANG BATU","TUKANG LISTRIK","TUKANG KAYU","TUKANG SOL SEPATU","TUKANG LAS/PANDAI BESI","TUKANG JAIT","TUKANG GIGI","PENATA RIAS","PENATA BUSANA","PENATA RAMBUT","MEKANIK","SENIMAN","TABIB","PARAJI","PERANCANG BUSANA","PENTERJEMAH","IMAM MASJID","PENDETA","PASTOR","WARTAWAN","USTADZ/MUBALIGH","JURU MASAK","PROMOTOR ACARA","ANGGOTA DPR RI","ANGGOTA DPD","ANGGOTA BPK","PRESIDEN","WAKIL PRESIDEN","ANGGOTA MAHKAMAH KONSTITUSI","DUTA BESAR","GUBERNUR","WAKIL GUBERNUR","BUPATI","WAKIL BUPATI","WALIKOTA","WAKIL WALIKOTA","ANGGOTA DPRD PROP","ANGGOTA DPRD KAB. KOTA","DOSEN","GURU","PILOT","PENGACARA","NOTARIS","ARSITEK","AKUNTAN","KONSULTAN","DOKTER","BIDAN","PERAWAT","APOTEKER","PSIKIATER/PSIKOLOG","PENYIAR TELEVISI","PENYIAR RADIO","PELAUT","PENELITI","SOPIR","PIALANG","PARANORMAL","PEDAGANG","PERANGKAT DESA","KEPALA DESA","BIARAWATI","WIRASWASTA","BURUH MIGRAN"]
            },
            {
                field: 'pekerjaan_ped', type: 'dropdown',
                source: ["Tidak Diketahui","Tidak Diketahui","Petani","Pedagang","Petani Kebun","Tukang Batu / Jasa Lainnya","Seniman"]
            },
            {
                field: 'kewarganegaraan', type: 'dropdown',
                source: ['Tidak Diketahui', 'WNI', 'WNA', 'DWIKEWARGANEGARAAN']
            },
            {
                field: 'kompetensi', type: 'dropdown',
                source: ["Tidak Diketahui","Kesehatan","Profesional Bangunan","Profesional Kelistrikan","Profesional Pendidikan"]
            },
            {field: 'no_telepon', type: 'text'},
            {field: 'email', type: 'text'},
            {field: 'no_kitas', type: 'text'},
            {field: 'no_paspor', type: 'text'},
            {
                field: 'golongan_darah', type: 'dropdown',
                source: ['A', 'A+', 'A-', 'B', 'B+', 'B-', 'AB', 'AB+', 'AB-', 'O', 'O+', 'O-', 'Tidak Diketahui']
            },
            {field: 'rt', type: 'text'},
            {field: 'rw', type: 'text'},
            {field: 'nama_dusun', type: 'text'},
            {
                field: 'status_penduduk', type: 'dropdown',
                source: ['Tidak diketahui', 'Tinggal Tetap', 'Meninggal', 'Pindahan Keluar', 'Pindahan Masuk']
            },
            {   
                field: 'status_tinggal', type: 'dropdown',
                source: ['Tidak Diketahui', 'Tinggal Tetap', 'Tinggal di luar desa (dalam 1 kab/kota)',
                'Tinggal di luar kota','Tinggal di luar provinsi','Tinggal di luar negeri']
            },
            {
                field: 'kontrasepsi', type: 'dropdown',
                source: ['Tidak Diketahui', 'Pil', 'Suntik', 'IUD', 'Kondom', 'Implant', 'MOP', 'MOW']
            },
            {
                field: 'difabilitas', type: 'dropdown',
                source: ['Tidak Diketahui', 'Tidak Cacat', 'Cacat Fisik', 'Cacat Netra / Buta', 'Cacat Rungu / Wicara', 'Cacat Mental / Jiwa', 'Cacat Lainnya']
            },
            {field: 'no_kk', type: 'text'},
            {field: 'alamat_jalan', type: 'text'},
            {field: 'nama_ayah', type: 'text'},
            {field: 'nama_ibu', type: 'text'},
            {
                field: 'hubungan_keluarga', type: 'dropdown',
                source: ['Tidak Diketahui', 'Kepala Keluarga', 'Suami', 'Istri', 'Anak', 'Menantu', 'Mertua', 'Famili Lain']
            },
          ],
          fixedColumnsLeft: 2,
          search: true,
          filters: true,
          contextMenu: ['row_above', 'remove_row'],
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
    });
    var searchForm = document.getElementById('search-form');
    searchForm.onsubmit = function(){
        return false;
    };
    
    var importExcel = function(){
        var files = remote.dialog.showOpenDialog();
        if(files && files.length){
            var objData = importPenduduk(files[0]);
            var columns = hot.getSettings().columns;
            var data = objData.map(function(source){
                var result = [];
                for(var i = 0; i < columns.length; i++){
                    result.push(source[columns[i].field]);
                }
                return result;
            });
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
