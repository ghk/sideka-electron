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

var Handsontable = require('./handsontablep/dist/handsontable.full.js');
function monospaceRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    td.className = 'monospace';
    return td;
}

function anggaranRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.NumericRenderer.apply(this, arguments);
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
    Handsontable.renderers.TextRenderer.apply(this, arguments);
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


for(var i = 0; i < pendudukSchema.length; i++){
    //pendudukSchema[i].type = "text";
    //pendudukSchema[i].readOnly   = true;
}

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

export default schemas;
