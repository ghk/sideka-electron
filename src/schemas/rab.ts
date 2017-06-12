import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        field: 'Id', 
        width: 0,
        type: 'text',
        hiddenColumn:true,
        editor:false
    },
    {
        header: 'Flag',
        field: 'Kd_Keg', 
        width: 0,
        type: 'text',
        hiddenColumn:true
    },
    {
        header: 'Kode Rekening',
        field: 'Kode_Rekening', 
        type: 'text',
        width: 200,
    },
    {
        header: 'No Bidang / Kegiatan',
        type: 'text',
        field: 'Kd_Bid_Or_Keg',
        width: 100,
    },
    {
        header: 'Uraian',
        type: 'text',
        field: 'Uraian',
        width: 450,
        renderer: renderers.uraianRABRenderer,
    },
    {
        header: 'Jumlah Satuan',
        field: 'JmlSatuan',
        type: 'numeric',
        width: 120,
        format: '0,0',
        
    },
    {
        header: 'Jumlah Satuan PAK',
        field: 'JmlSatuanPAK',
        type: 'numeric',
        width: 120,
        format: '0,0',
        
    },
    {
        header: 'Satuan',
        field: 'Satuan',
        type: 'text',
        width: 150,
        format: '0,0',
        
    },
    {
        header: 'Harga Satuan',
        type: 'numeric',
        field: 'HrgSatuan',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
    {
        header: 'Harga Satuan PAK',
        type: 'numeric',
        field: 'HrgSatuanPAK',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
    {
        header: 'Sumberdana',
        field: 'SumberDana',
        type: 'text',
        width: 120,
    },
    {
        header: 'Anggaran',
        type: 'numeric',
        field: 'Anggaran',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer, 
        editor:false,
    },     
    {
        header: 'Anggaran Setelah PAK',
        type: 'numeric',
        field: 'AnggaranStlhPAK',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer, 
        editor:false
    },
    {
        header: 'Perubahan',
        type: 'numeric',
        field: 'Perubahan',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer, 
        editor:false
    }
]
