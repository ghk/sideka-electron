import * as renderers from './renderers';
export default [
    {
        header: 'Id',
        field: 'id', 
        width: 220,
        type: 'text',        
        hiddenColumn:true,
        editor:false
    },
    {
        header: 'Kode Bidang',
        field: 'kode_bidang', 
        type: 'text',
        width: 120,
        editor:false
    },
    {
        header: 'Nama Bidang',
        field: 'nama_bidang', 
        type: 'text',
        width: 300,
        editor:false
    },
    {
        header: 'Kode Kegiatan',
        field: 'kode_kegiatan', 
        type: 'text',
        width: 120,
        editor:false
    },
    {
        header: 'Nama Kegiatan',
        field: 'nama_kegiatan', 
        type: 'text',
        width: 300,
        editor:false
    },
    {
        header: 'Lokasi',
        field: 'lokasi_spesifik', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Volume',
        field: 'volume', 
        type:'numeric',
        width: 120,
        defaultData: 0
        
    },
    {
        header: 'Satuan',
        field: 'satuan', 
        type: 'text',
        width: 100,
    },
    {
        header: 'Jumlah Sasaran Pria',
        field: 'jumlah_sasaran_pria',
        type: 'numeric',
        width: 200,
        format: '0,0',
        defaultData: 0
    },
    {
        header: 'Jumlah Sasaran Wanita',
        field: 'jumlah_sasaran_wanita', 
        type: 'numeric',
        width: 200,
        format: '0,0',
        defaultData: 0
    },    
    {
        header: 'Jumlah Sasaran RTM',
        field: 'jumlah_sasaran_rumah_tangga', 
        type: 'numeric',
        width: 200,
        format: '0,0',
        defaultData: 0
    },
    {
        header: 'Sumber Dana',
        field: 'sumber_dana', 
        type: 'dropdown',
        width: 120,
        source: []
    },
    {
        header: 'Waktu',
        field: 'waktu', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Mulai',
        field: 'mulai', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/2000',
        width: 120,
    },
    {
        header: 'Selesai',
        field: 'selesai', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/2000',
        width: 120,
    },
    {
        header: 'Biaya',
        field:'anggaran',
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },    
    {
        header: 'Pola Kegiatan',
        field: 'pola_kegiatan', 
        type: 'dropdown',
        source: ['Swakelola', 'Kerjasama', 'Pihak Ketiga'],
        width: 130,
    },  
    {
        header: 'Pelaksana',
        field: 'pelaksana',
        type: 'text',
        width: 200,
    },
    {
        header: 'Kd_Tahun',
        field: 'kode_tahun', 
        width: 0,
        type: 'text',        
        hiddenColumn:true
    },
]