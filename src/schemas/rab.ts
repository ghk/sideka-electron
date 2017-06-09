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
        header: 'Flag',
        field: 'flag', 
        width: 0,
        type: 'text',
        hiddenColumn:true
    },
    {
        header: 'Kode Rekening',
        field: 'kode_rekening', 
        type: 'text',
        width: 200,
        renderer: renderers.monospaceRenderer,
    },
    {
        header: 'No Bidang / Kegiatan',
        type: 'text',
        field: 'no_bid_or_keg',
        width: 100,
    },
    {
        header: 'Uraian',
        type: 'text',
        field: 'uraian',
        width: 450,
        renderer: renderers.uraianRABRenderer,
    },
    {
        header: 'Jumlah Satuan',
        field: 'jml_satuan',
        type: 'text',
        width: 120,
        
    },
    {
        header: 'Jumlah Satuan PAK',
        field: 'jml_satuan_PAK',
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
        header: 'Harga Satuan PAK',
        type: 'numeric',
        field: 'hrg_satuan_PAK',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
    {
        header: 'Sumberdana',
        field: 'sumberdana',
        type: 'text',
        width: 120,
    },
    {
        header: 'Anggaran',
        type: 'numeric',
        field: 'anggaran',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },     
    {
        header: 'Anggaran Setelah PAK',
        type: 'numeric',
        field: 'anggaran_setelah_PAK',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
    {
        header: 'Perubahan',
        type: 'numeric',
        field: 'perubahan',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    }
]
