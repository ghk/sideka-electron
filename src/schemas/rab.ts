import * as renderers from './renderers';

export default [
    {
        header: 'Kode',
        field: 'kode_rekening', 
        type: 'text',
        width: 100
    },
    {
        header: 'Uraian',
        field: 'uraian', 
        type: 'text',
        width: 450,
        renderer: renderers.uraianRenderer,
    },
    {
        header: 'Volume',
        field: 'uraian', 
        type: 'text',
        width: 150,
        renderer: renderers.uraianRenderer,
        
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
        header: 'Jumlah',
        field: 'anggaran', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer: renderers.anggaranRenderer
    },
]
