import * as renderers from './renderers';

export default [
    {
        header: 'Kode', 
        type: 'text',
        field: 'kode_rekening',
        width: 100,
        renderer: renderers.monospaceRenderer,
        validator: renderers.kodeRekeningValidator,
    },
    {
        header: 'No Urut',
        type: 'text',
        field: 'no_urut',
        width: 100,
        renderer: renderers.uraianRenderer,
    },
    {
        header: 'Uraian',
        type: 'text',
        field: 'uraian',
        width: 450,
        renderer: renderers.uraianRenderer,
    },
    {
        header: 'Jumlah Satuan',
        field: 'jml_satuan',
        type: 'text',
        width: 120,
        
    },
    {
        header: 'Satuan',
        field: 'satuan',
        type: 'text',
        width: 150,
        
    },
    {
        header: 'Harga Satuan',
        type: 'numeric',
        field: 'hrg_satuan',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
    {
        header: 'Sumberdana',
        field: 'summberdana',
        type: 'text',
        width: 120,
    },
    {
        header: 'Anggaran',
        type: 'numeric',
        field: 'anggaran',
        width: 220,
        format: '0,0',
        validator: renderers.anggaranValidator,
        renderer: renderers.anggaranRenderer
    },
    {
        header: 'Perubahan',
        type: 'numeric',
        field: 'perubahan',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
    {
        header: 'Jumlah',
        type: 'numeric',
        field: 'jumlah',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
]
