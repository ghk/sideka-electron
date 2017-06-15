import * as renderers from './renderers';
export default [
    {
        header: 'Id',
        field: 'id', 
        width: 0,
        type: 'text',
        hiddenColumn:true
    },
    {
        header: 'Kd Bid',
        field: 'Kd_Bid', 
        type: 'text',
        width: 100,
        editor:false
    },
    {
        header: 'Nama Bidang',
        field: 'Nama_Bidang', 
        type: 'text',
        width: 300,
        editor:false
    },
    {
        header: 'Kd Keg',
        field: 'Kd_Keg', 
        type: 'text',
        width: 100,
        editor:false
    },
    {
        header: 'Nama Kegiatan',
        field: 'Nama_Kegiatan', 
        type: 'text',
        width: 300,
        editor:false
    },
    {
        header: 'Lokasi',
        field: 'Lokasi_Spesifik', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Volume',
        field: 'Volume', 
        type:'text',
        width: 100,
        
    },
    {
        header: 'Satuan',
        field: 'Satuan', 
        type: 'text',
        width: 100,
    },
    {
        header: 'Jml.Sas-Pria',
        field: 'Jml_Sas_Pria', 
        type: 'text',
        width: 130,
    },
    {
        header: 'Jml.Sas-Wanita',
        field: 'Jml_Sas_Wanita', 
        type: 'text',
        width: 130,
    },    
    {
        header: 'Jml.Sas Rm-Tangga',
        field: 'Jml_Sas_ARTM', 
        type: 'text',
        width: 130,
    },
    {
        header: 'Sumberdana',
        field: 'Kd_Sumber', 
        type: 'text',
        width: 100,
    },
    {
        header: 'Waktu',
        field: 'Waktu', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Mulai',
        field: 'Mulai', 
        type: 'date',
        dateFormat: 'dd/mm/yy',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 120,
    },
    {
        header: 'Selesai',
        field: 'Selesai', 
        type: 'date',
        dateFormat: 'dd/mm/yy',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 120,
    },
    {
        header: 'Biaya',
        field:'Biaya',
        type: 'numeric',
        width: 220,
        format: '0,0',
    },    
    {
        header: 'Pola_Kegiatan',
        field: 'Pola_Kegiatan', 
        type: 'text',
        width: 100,
    },  
    {
        header: 'Pelaksana',
        field: 'Pelaksana',
        type: 'text',
        width: 200,
    },
    {
        header: 'Kd_Tahun',
        field: 'Kd_Tahun', 
        width: 0,
        type: 'text',        
        hiddenColumn:true
    },
]