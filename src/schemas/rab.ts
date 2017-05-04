import * as renderers from './renderers';

export default [
    {
        header: 'Kode',
        field: 'kode_rekening', 
        type: 'text',
        width: 100
    },
    {
        header: 'No Urut',
        field: 'uraian', 
        type: 'text',
        width: 100,
        renderer: renderers.uraianRenderer,
    },
    {
        header: 'Uraian',
        field: 'uraian', 
        type: 'text',
        width: 450,
        renderer: renderers.uraianRenderer,
    },
    {
        header: 'Jumlah Satuan',
        field: 'uraian', 
        type: 'text',
        width: 120,
        
    },
    {
        header: 'Satuan',
        field: 'uraian', 
        type: 'text',
        width: 150,
        
    },
    {
        header: 'Harga Satuan',
         field: 'anggaran', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer: renderers.anggaranRenderer
    },
    {
        header: 'Sumberdana',
        field: 'anggaran', 
        type: 'text',
        width: 120,
    },
    {
        header: 'Anggaran',
        field: 'anggaran', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer: renderers.anggaranRenderer
    },
    {
        header: 'Perubahan',
        field: 'anggaran', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer: renderers.anggaranRenderer
    },
    {
        header: 'Jumlah',
        field: 'anggaran', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer: renderers.anggaranRenderer
    },
]
