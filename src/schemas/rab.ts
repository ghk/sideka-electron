import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        field: 'Id', 
        width: 0,
        type: 'text',
        hiddenColumn:false,
        editor:false
    },
    {
        header: 'Flag',
        field: 'Kd_Keg', 
        width: 0,
        type: 'text',
        hiddenColumn:false
    },
    {
        header: 'Kode Rekening',
        field: 'Kode_Rekening', 
        type: 'text',
        width: 150,        
        editor:false
    },
    {
        header: 'No Bid/Keg',
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
        header: 'Sumberdana',
        field: 'SumberDana',
        type: 'text',
        width: 120,
    },
    {
        header: 'Jumlah Satuan',
        field: 'JmlSatuan',
        type: 'numeric',
        width: 120,
        format: '0,0',
        
    },
    {
        header: 'Satuan',
        field: 'Satuan',
        type: 'text',
        width: 100,
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
        header: 'Anggaran',
        type: 'numeric',
        field: 'Anggaran',
        width: 220,
        format: '0,0',
        renderer : renderers.anggaranRenderer,
        editor:false,
    },          
    {
        header: 'Jumlah Satuan PAK',
        field: 'JmlSatuanPAK',
        type: 'numeric',
        width: 150,
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
        header: 'Harga Satuan PAK',
        type: 'numeric',
        field: 'HrgSatuanPAK',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
    
    {
        header: 'Anggaran Setelah PAK',
        type: 'numeric',
        field: 'AnggaranStlhPAK',
        width: 220,
        format: '0,0',
        renderer :renderers.anggaranPAKRenderer, 
        editor:false
    },
    {
        header: 'Perubahan',
        type: 'numeric',
        field: 'AnggaranPAK',
        width: 220,
        format: '0,0',
        renderer :renderers.perubahanRenderer, 
        editor:false
    }
]
