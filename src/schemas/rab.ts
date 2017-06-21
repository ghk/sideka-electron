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
        header: 'Kd Keg',
        field: 'Kd_Keg', 
        width: 0,
        type: 'text',
        hiddenColumn:true
    },
    {
        header: 'Kode Rekening',
        field: 'Kode_Rekening', 
        type: 'text',
        width: 150,        
        editor:false
    },
    {
        header: 'No Bidang / Kegiatan',
        type: 'text',
        field: 'Kd_Bid_Or_Keg',
        width: 170,
    },
    {
        header: 'Uraian',
        type: 'text',
        field: 'Uraian',
        width: 450,
        renderer: renderers.uraianRABRenderer,
    },
    {
        header: 'Sumber Dana',
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
        editor: 'text'
        
    },
    {
        header: 'Satuan',
        field: 'Satuan',
        type: 'text',
        width: 100,
        format: '0,0',
        editor: 'text'
        
    },   
    {
        header: 'Harga Satuan',
        type: 'numeric',
        field: 'HrgSatuan',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
        editor: 'text'
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
        editor:false
        
    },
    {
        header: 'Satuan',
        field: 'Satuan',
        type: 'text',
        width: 150,
        format: '0,0',        
        editor:false
        
    }, 
    {
        header: 'Harga Satuan PAK',
        type: 'numeric',
        field: 'HrgSatuanPAK',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,        
        editor:false
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
