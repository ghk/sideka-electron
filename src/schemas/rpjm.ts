import * as renderers from './renderers';

export default [
    {
        header: 'Nama Bidang',
        field: 'Nama_Bidang', 
        type: 'text',
        width: 300,
    },
    {
        header: 'Nama Kegiatan',
        field: 'Nama_Kegiatan', 
        type: 'text',
        width: 450,
    },
    {
        header: 'Lokasi',
        field: 'Lokasi', 
        type:'text',
        width: 220,
        
    },
    {
        header: 'Volume',
        field: 'Volume', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Sasaran',
        field: 'Sasaran', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Tahun 1',
        field: 'Tahun1',
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 80,
    },
    {
        header: 'Tahun 2',
        field: 'Tahun2', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 80,
    },
    {
        header: 'Tahun 3',
        field: 'Tahun3', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 80,
        
    },
    {
        header: 'Tahun 4',
        field: 'Tahun4', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 80,
        
    },
    {
        header: 'Tahun 5',
        field: 'Tahun5', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 80,
    },
    {
        header: 'Tahun 6',
        field: 'Tahun6', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 80,
    },
    {
        header: 'Biaya',
        field: 'Biaya', 
        type: 'numeric',
        width: 220,
        format: '0,0',     
        renderer: renderers.anggaranRenderer
    },
    {
        header: 'Sumberdana',
        field: 'Sumberdana', 
        type: 'text',
        width: 100,
    },
    {
        header: 'Swakelola',
        field: 'Swakelola', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },    
    {
        header: 'Kerjasama',
        field: 'Kerjasama', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },
    {
        header: 'Pihak Ketiga',
        field: 'Pihak_Ketiga',
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    }
]



