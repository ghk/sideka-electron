import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        field: 'id', 
        width: 0,
        type: 'text',
        hiddenColumn: true
    },
    {
        header: 'Kode Bidang',
        field: 'Kd_Bid', 
        type: 'text',
        width: 150,
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
        header: 'Kode Kegiatan',
        field: 'Kd_Keg', 
        type: 'text',
        width: 150,
        editor:false
    },
    {
        header: 'Nama Kegiatan',
        field: 'Nama_Kegiatan', 
        type: 'text',
        width: 500,
        editor:false
    },
    {
        header: 'Kode Sasaran',
        field: 'Kd_Sas', 
        type:'text',
        width: 220,
        editor:false
    },
    {
        header: 'Sasaran Renstra',
        field: 'Uraian_Sasaran', 
        type: 'text',
        width: 600,
        editor:false
    },
    {
        header: 'Lokasi',
        field: 'Lokasi', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Sasaran',
        field: 'Sasaran', 
        type: 'text',
        width: 300,
    },
    {
        header: 'Keluaran',
        field: 'Keluaran', 
        type: 'text',
        width: 300
    },
    {
        header: 'Tahun 1',
        field: 'Tahun1',
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
    },
    {
        header: 'Tahun 2',
        field: 'Tahun2', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
    },
    {
        header: 'Tahun 3',
        field: 'Tahun3', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
        
    },
    {
        header: 'Tahun 4',
        field: 'Tahun4', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
        
    },
    {
        header: 'Tahun 5',
        field: 'Tahun5', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
    },
    {
        header: 'Tahun 6',
        field: 'Tahun6', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
    },
    {
        header: 'Swakelola',
        field: 'Swakelola', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 100,
    },    
    {
        header: 'Kerjasama',
        field: 'Kerjasama', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 100,
    },
    {
        header: 'Pihak Ketiga',
        field: 'Pihak_Ketiga',
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 100,
    }
]



