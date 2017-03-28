import * as renderers from './renderers';

export default [
    {
        header: '1',
        field: 'Nama_Bidang', 
        type: 'text',
        width: 500,
    },
    {
        header: '2',
        field: 'Nama_Kegiatan', 
        type: 'text',
        width: 450,
    },
    {
        header: '3',
        field: 'Lokasi', 
        type:'text',
        width: 220,
        
    },
    {
        header: '4',
        field: 'Volume', 
        type: 'text',
        width: 200,
    },
    {
        header: '5',
        field: 'Sasaran', 
        type: 'text',
        width: 200,
    },
    {
        header: '6',
        field: 'Tahun1',
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },
    {
        header: '7',
        field: 'Tahun2', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },
    {
        header: '8',
        field: 'Tahun3', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
        
    },
    {
        header: '9',
        field: 'Tahun4', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
        
    },
    {
        header: '10',
        field: 'Tahun5', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },
    {
        header: '11',
        field: 'Tahun6', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },
    {
        header: '12',
        field: 'Biaya', 
        type: 'numeric',
        width: 220,
        format: '0,0',     
        renderer: renderers.anggaranRenderer
    },
    {
        header: '13',
        field: 'Sumberdana', 
        type: 'text',
        width: 100,
    },
    {
        header: '14',
        field: 'Swakelola', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },    
    {
        header: '15',
        field: 'Kerjasama', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },
    {
        header: '16',
        field: 'Pihak_Ketiga',
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    }
]



