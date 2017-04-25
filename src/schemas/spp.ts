import * as renderers from './renderers';

export default [
    {
        header: 'Kode',
        field: 'No_SPP', 
        type: 'text',
        width: 200
    },
    {
        header: 'Tanggal SPP',
        field: 'Tgl_SPP', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 170,
    },
    {
        header: 'Keterangan',
        field: 'Keterangan', 
        type: 'text',
        width: 450,
        renderer: renderers.uraianRenderer,
        
    },
    {
        header: 'Nama_Rincian',
        field: 'Nama_SubRinci', 
        type: 'text',
        width: 450,
    },
    {
        header: 'Jenis SPP',
        field: 'Jn_SPP', 
        type: 'text',
        width: 100
    },
    {
        header: 'Nilai',
        field: 'Nilai', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer: renderers.anggaranRenderer
    },
    {
        header: 'Sumberdana',
        field: 'Sumberdana', 
        type: 'text',
        width: 150
    },
    {
        header: 'Jumlah',
        field: 'Jumlah', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer: renderers.anggaranRenderer
    }
]
