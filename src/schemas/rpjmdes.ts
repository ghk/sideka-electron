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
        field: 'Waktu', 
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
        type: 'text',
        width: 100,
    },
    {
        header: '7',
        field: 'Tahun2', 
        type: 'text',
        width: 450,
    },
    {
        header: '8',
        field: 'Tahun3', 
        type:'text',
        width: 220,
        
    },
    {
        header: '9',
        field: 'Tahun5', 
        type: 'text',
        width: 200,
    },
    {
        header: '10',
        field: 'Tahun6', 
        type: 'text',
        width: 200,
    },
    {
        header: '11',
        field: 'Biaya', 
        type: 'text',
        width: 100,
    },
    {
        header: '12',
        field: 'Sumberdana', 
        type: 'text',
        width: 450,
    },
    {
        header: '13',
        field: 'Swakelola', 
        type: 'text',
        width: 450,
    },    
    {
        header: '14',
        field: 'Kerjasama', 
        type: 'text',
        width: 200,
    },
    {
        header: '15',
        field: 'Pihak_Ketiga', 
        type: 'text',
        width: 200,
    }
]

var nestedHeaders= [
  [{label: 'Bidang / Jenis Kegiatan ', colspan: 2}, {label: 'Lokasi', rowspan: 2}, 'C'],
  ['D', {label: 'E', colspan: 4}, {label: 'F', colspan: 4}, 'G'],
  ['H', {label: 'I', colspan: 2}, {label: 'J', colspan: 2}, {label: 'K', colspan: 2}, {label: 'L', colspan: 2}, 'M'],
  ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W']
]
