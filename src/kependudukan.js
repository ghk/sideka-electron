// Here is the starting point for your application code.
// All stuff below is just to show you how it works. You can delete all of it.

// Use new ES6 modules syntax for everything.
import os from 'os'; // native node.js module
import jQuery from 'jquery';
import { remote, app } from 'electron'; // native electron module
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
            {
                data: 'pekerjaan', type: 'dropdown',
                source: ["Tidak Diketahui","BELUM/TIDAK BEKERJA","MENGURUS RUMAH TANGGA","PELAJAR/MAHASISWA","PENSIUNAN","PEGAWAI NEGERI SIPIL (PNS)","TENTARA NASIONAL INDONESIA (TNI)","KEPOLISIAN RI ","PERDAGANGAN","PETANI/PEKEBUN","PETERNAK","NELAYAN/PERIKANAN","INDUSTRI","KONSTRUKSI","TRANSPORTASI","KARYAWAN SWASTA","KARYAWAN BUMN","KARYAWAN HONORER","BURUH HARIAN LEPAS","BURUH TANI/PERKEBUNAN","BURUH NELAYAN/PERIKANAN","BURUH PETERNAKAN","PEMBANTU RUMAH TANGGA","TUKANG CUKUR","TUKANG BATU","TUKANG LISTRIK","TUKANG KAYU","TUKANG SOL SEPATU","TUKANG LAS/PANDAI BESI","TUKANG JAIT","TUKANG GIGI","PENATA RIAS","PENATA BUSANA","PENATA RAMBUT","MEKANIK","SENIMAN","TABIB","PARAJI","PERANCANG BUSANA","PENTERJEMAH","IMAM MASJID","PENDETA","PASTOR","WARTAWAN","USTADZ/MUBALIGH","JURU MASAK","PROMOTOR ACARA","ANGGOTA DPR RI","ANGGOTA DPD","ANGGOTA BPK","PRESIDEN","WAKIL PRESIDEN","ANGGOTA MAHKAMAH KONSTITUSI","DUTA BESAR","GUBERNUR","WAKIL GUBERNUR","BUPATI","WAKIL BUPATI","WALIKOTA","WAKIL WALIKOTA","ANGGOTA DPRD PROP","ANGGOTA DPRD KAB. KOTA","DOSEN","GURU","PILOT","PENGACARA","NOTARIS","ARSITEK","AKUNTAN","KONSULTAN","DOKTER","BIDAN","PERAWAT","APOTEKER","PSIKIATER/PSIKOLOG","PENYIAR TELEVISI","PENYIAR RADIO","PELAUT","PENELITI","SOPIR","PIALANG","PARANORMAL","PEDAGANG","PERANGKAT DESA","KEPALA DESA","BIARAWATI","WIRASWASTA","BURUH MIGRAN"]
            },
            {
                data: 'pekerjaan_ped', type: 'dropdown',
                source: ["Tidak Diketahui","Tidak Diketahui","Petani","Pedagang","Petani Kebun","Tukang Batu / Jasa Lainnya","Seniman"]
            },
            {
                data: 'kewarganegaraan', type: 'dropdown',
                source: ['Tidak Diketahui', 'WNI', 'WNA', 'DWIKEWARGANEGARAAN']
            },
            {
                data: 'kompetensi', type: 'dropdown',
                source: ["Tidak Diketahui","Kesehatan","Profesional Bangunan","Profesional Kelistrikan","Profesional Pendidikan"]
            },
            {data: 'no_telepon', type: 'text'},
            {data: 'email', type: 'text'},
            {data: 'no_kitas', type: 'text'},
            {data: 'no_paspor', type: 'text'},
            {
                data: 'golongan_darah', type: 'dropdown',
                source: ['A', 'A+', 'A-', 'B', 'B+', 'B-', 'AB', 'AB+', 'AB-', 'O', 'O+', 'O-', 'Tidak Diketahui']
            },
            {data: 'rt', type: 'text'},
            {data: 'rw', type: 'text'},
            {data: 'nama_dusun', type: 'text'},
            {
                data: 'status_penduduk', type: 'dropdown',
                source: ['Tidak diketahui', 'Tinggal Tetap', 'Meninggal', 'Pindahan Keluar', 'Pindahan Masuk']
            },
            {   
                data: 'status_tinggal', type: 'dropdown',
                source: ['Tidak Diketahui', 'Tinggal Tetap', 'Tinggal di luar desa (dalam 1 kab/kota)',
                'Tinggal di luar kota','Tinggal di luar provinsi','Tinggal di luar negeri']
            },
            {
                data: 'kontrasepsi', type: 'dropdown',
                source: ['Tidak Diketahui', 'Pil', 'Suntik', 'IUD', 'Kondom', 'Implant', 'MOP', 'MOW']
            },
            {
                data: 'difabilitas', type: 'dropdown',
                source: ['Tidak Diketahui', 'Tidak Cacat', 'Cacat Fisik', 'Cacat Netra / Buta', 'Cacat Rungu / Wicara', 'Cacat Mental / Jiwa', 'Cacat Lainnya']
            },
            {data: 'no_kk', type: 'text'},
            {data: 'alamat_jalan', type: 'text'},
            {data: 'nama_ayah', type: 'text'},
            {data: 'nama_ibu', type: 'text'},
            {
                data: 'hubungan_keluarga', type: 'dropdown',
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

    document.getElementById('save-btn').onclick = function(){
        console.log(hot.getData()[0]);
        console.log(app.getPath("userData"));
    };
    
    if(initialData.length == 0)
    {
        jQuery(emptyContainer).removeClass("hide");
    }
    else 
    {
        jQuery(sheetContainer).removeClass("hide");
    }
    
    window.addEventListener('resize', function(e){
        hot.render();
    })
    
});
