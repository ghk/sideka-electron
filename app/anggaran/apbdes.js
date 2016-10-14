(function () {'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = _interopDefault(require('path'));
var fs = require('fs');
var $ = _interopDefault(require('jquery'));
var electron = require('electron');
var jetpack = _interopDefault(require('fs-jetpack'));
var docxtemplater = require('docxtemplater');
var XLSX = _interopDefault(require('xlsx'));
var d3 = _interopDefault(require('d3'));
var request = _interopDefault(require('request'));

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
        console.log(td.innerHTML);
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
    td.style.paddingLeft = (level * 10)+"px";
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

var Handsontable = require('./handsontablep/dist/handsontable.full.js');
var hot;
var sheetContainer;
var emptyContainer;

document.addEventListener('DOMContentLoaded', function () {
    $("title").html("APBDes - " +dataapi.getActiveAuth().desa_name);

    sheetContainer = document.getElementById('sheet');
    emptyContainer = document.getElementById('empty');
    window.hot = hot = new Handsontable(sheetContainer, {
        data: [],
        topOverlay: 34,

        rowHeaders: true,
        colHeaders: schemas.getHeader(schemas.apbdes),
        columns: schemas.apbdes,

        colWidths: schemas.getColWidths(schemas.apbdes),
        rowHeights: 23,
        
        columnSorting: true,
        sortIndicator: true,
        
        renderAllRows: false,
        outsideClickDeselects: false,
        autoColumnSize: false,
        search: true,
        filters: true,
        contextMenu: ['row_above', 'remove_row'],
        dropdownMenu: ['filter_by_condition', 'filter_action_bar'],
    });
    
    var formSearch = document.getElementById("form-search");
    var inputSearch = document.getElementById("input-search");
    initializeTableSearch(hot, document, formSearch, inputSearch);
    
    var spanSelected = $("#span-selected")[0];
    initializeTableSelected(hot, 1, spanSelected);
    
    var spanCount = $("#span-count")[0];
    initializeTableCount(hot, spanCount);

    window.addEventListener('resize', function(e){
        hot.render();
    })
 
    var importExcel = function(){
        var files = electron.remote.dialog.showOpenDialog();
        if(files && files.length){
            var objData = importApbdes(files[0]);
            var data = objData.map(o => schemas.objToArray(o, schemas.apbdes));

            hot.loadData(data);
            setTimeout(function(){
                hot.render();
            },500);
        }
    }
    document.getElementById('btn-open').onclick = importExcel;
    schemas.registerCulture(window);

    
});
}());
//# sourceMappingURL=apbdes.js.map