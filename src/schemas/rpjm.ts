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
        field: 'Tahun5', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },
    {
        header: '10',
        field: 'Tahun6', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },
    {
        header: '11',
        field: 'Biaya', 
        type: 'numeric',
        width: 220,
        format: '0,0',     
        renderer: renderers.anggaranRenderer
    },
    {
        header: '12',
        field: 'Sumberdana', 
        type: 'text',
        width: 100,
    },
    {
        header: '13',
        field: 'Swakelola', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },    
    {
        header: '14',
        field: 'Kerjasama', 
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    },
    {
        header: '15',
        field: 'Pihak_Ketiga',
        type: 'checkbox',
        checkedTemplate: 'true',
        uncheckedTemplate: 'false',
        width: 100,
    }
]

var nestedHeaders= [
  [{label: 'Bidang / Jenis Kegiatan ', colspan: 2}, {label: 'Lokasi', rowspan: 2}, 'C'],
  ['D', {label: 'E', colspan: 4}, {label: 'F', colspan: 4}, 'G'],
  ['H', {label: 'I', colspan: 2}, {label: 'J', colspan: 2}, {label: 'K', colspan: 2}, {label: 'L', colspan: 2}, 'M'],
  ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W']
]
