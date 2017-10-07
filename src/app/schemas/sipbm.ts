import * as renderers from './renderers';

export default [
    {
        header: 'id',
        type: 'text',
        field: 'id',
        readOnly: true
    },
    {
        header: 'No KK',
        type: 'text',
        field: 'no_kk',
        readOnly: true

    },    
    {
        header: 'Nama Kepala Keluarga',
        type: 'text',
        field:'nama_kepala_keluarga',
        readOnly: true
    },
    {
        header: 'Nama Responden',
        type: 'text',
        field: 'nama_responden'
    },
    {
        header: 'No Responden',
        type: 'text',
        field: 'no_responden'
    },  
    {
        header: 'Nama Pendata',
        type: 'text',
        field: 'nama_pendata'
    },    
    {
        header: 'Nama Pemeriksa',
        type: 'text',
        field: 'nama_pemeriksa'
    },
    {
        header: 'Tanggal Pemeriksaan',
        type: 'date',
        field: 'tanggal_pemeriksaan',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 120,
    },
    {
        header: 'Memiliki KK',   
        type: 'dropdown',    
        field: 'memiliki_kk',
        source: ['ya', 'tidak']
    },
    {
        header: 'Pekerjaan Kep.Kel',
        type: 'text',
        field:'pekerjaan_kepala_keluarga',
    },
    {
        header: 'Kepemilikan Rumah',
        type: 'dropdown',
        field: 'kepemilikan_rumah',
        source: ['Milik Sendiri', 'Sewa / Kontrak', 'Pinjam / Numpang Gratis', 'Milik Pemerintah']
       
    },
    {
        header: 'Bagian Terluas Atap',
        type: 'dropdown',
        field: 'bagian_terluas_atap',
        source: ['Genteng Metal', 'Sirap(kayu)', 'Genteng (tanah liat)', 'Asbes', 'Seng', 'Daun Rumbia','Alang-alang']
    },
    {
        header: 'Bagian Terluas dinding',
        type: 'dropdown',
        field: 'bagian_terluas_dinding',
        source: ['Tembok', 'Papan (Kualitas Bagus)','Papan (Kualitas Jelek)', 'Tripleks', 'Seng', 'Gamacca / Gedek', 'Bambu']
    },
    {
        header: 'Bagian Terluas Lantai',
        type: 'dropdown',
        field: 'bagian_terluas_lantai',
        source: ['Tegal / Keramik', 'Papan (Kualitas Bagus)','Papan (Kualitas Jelek)', 'Semen', 'Bambu', 'Tanah']
    },
    {
        header: 'Memiliki Jamban',
        type: 'dropdown',
        field: 'memiliki_jamban',
        source: ['Jamban / Wc Sendiri', 'Jamban / Wc Umum', 'Bukan Jamban / WC']
    },
    {
        header: 'Jenis jamban',
        type: 'dropdown',
        field: 'jenis_jamban',
        source: ['Cemplung', 'Plensengan', 'Leher Angsa']
    },
    {
        header: 'Sumber penerangan',
        type: 'dropdown',
        field: 'sumber_penerangan',
        source: ['Listrik PLN Milik Sendiri', 'Listrik PLN Sabung (bayar)', 'Listrik Sambung (Gratis)', 'Listik Non PLN', 'Lampu Petromax', 'Pelita / Lilin', 'Tidak Ada Penerangan']
    },
    {
        header: 'Sumber air minum',
        type: 'dropdown',
        field: 'sumber_air_minum',
        source: ['Air ledeng /PDAM /Kemasan', 'Sumur Bor/ Sumur Pompa/ Sumur Tertutup', 'Mata Air', 'Sumur Terbuka / Tidak Terlindungi', 'Kolam /Empang /Sungai /Parit /Danau', 'Air Hujan']

    },
    {
        header: 'Jarak Sumber Air Minum',
        type: 'text',
        field: 'jarak_sumber_air',
    },
    {
        header: 'Kualitas Air Minum',
        type: 'dropdown',
        field: 'kualitas_air',
        source: ['Berbau', 'Tidak Berbau', 'Berasa', 'Tidak Berasa', 'Berwarna', 'Tidak Berwarna']
    },
    {
        header: 'Air minum dimasak?',
        type: 'dropdown',
        field: 'air_minum_dimasak',        
        source: ['ya', 'tidak']
    },
    {
        header: 'Berapa Anak yang lahir',
        type: 'text',
        field: 'anak_yang_lahir'
    },
    {
        header: 'Berapa anak yang hidup',
        type: 'text',
        field: 'anak_yang_hidup'
    },
    {
        header: 'Berapa anak yang tinggal',
        type: 'text',
        field: 'anak_yang_tinggal'
    },
    {
        header: 'Adakah ibu hamil dalam 1 tahun?',
        type: 'dropdown',
        field: 'ada_ibu_hamil',        
        source: ['ya', 'tidak']
    },
    {
        header: 'Pernah memeiksa kehamilan?',
        type: 'dropdown',
        field: 'pemeriksaan_kehamilan',   
        source: ['ya', 'tidak']
    },
    {
        header: 'Adakah Peristiwa kelahiran di tahun ini',
        type: 'dropdown',
        field:'peristiwa_kelahiran',
        source: ['ya', 'tidak']
    },
    {
        header: 'Siapa Pemberi pertolongan',
        type: 'dropdown',
        field: 'pemberi_pertolongan',
        source: ['Keluarga / Lainnya', 'Dukun', 'Perawat', 'Bidan', 'Dokter']

    },
    {
        header: 'Diberikan Asi Untuk Bayi ?',
        type: 'dropdown',
        field: 'pemberian_asi_bayi',        
        source: ['ya', 'tidak']
    },
    {
        header: 'Adakah Peristiwa kematian karena ibu hamil?',
        type: 'dropdown',
        field: 'peristiwa_kematian_ibu_hamil',        
        source: ['ya', 'tidak']
    },    
    {
        header: 'Apakah mengkonsumsi Garam Beryodium?',
        type: 'dropdown',
        field: 'mengkonsumsi_garam_beryodium',
        source: ['ya', 'tidak']
    },   
    
]
