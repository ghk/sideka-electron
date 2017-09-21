import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        field: 'id', 
        width: 250,
        type: 'text',
        hiddenColumn:true,
        editor:false
    },
    {
        header: 'Kode Rekening',
        field: 'kode_rekening', 
        type: 'text',
        width: 150,        
        editor:false
    },
    {
        header: 'No Bidang / Kegiatan',
        type: 'text',
        field: 'kode_kegiatan',
        width: 170,
    },
    {
        header: 'Uraian',
        type: 'text',
        field: 'uraian',
        width: 450,
        renderer: renderers.uraianRABRenderer,
    },
    {
        header: 'Sumber Dana',
        field: 'sumber_dana',
        type: 'dropdown',
        width: 120,
        source: []
    },
    {
        header: 'Jumlah Satuan',
        field: 'jumlah_satuan',
        type: 'numeric',
        width: 120,
        format: '0,0',
        editor: 'text'
        
    },
    {
        header: 'Satuan',
        field: 'satuan',
        type: 'text',
        width: 100,
        format: '0,0',
        editor: 'text'
        
    },   
    {
        header: 'Harga Satuan',
        type: 'numeric',
        field: 'harga_satuan',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
        editor: 'text'
    },
    {
        header: 'Anggaran',
        type: 'numeric',
        field: 'anggaran',
        width: 220,
        format: '0,0',
        renderer : renderers.anggaranRenderer,
        editor:false,
    },          
    {
        header: 'Jumlah Satuan PAK',
        field: 'jumlah_satuan_pak',
        type: 'numeric',
        width: 150,
        format: '0,0',
        editor:false
        
    },
    {
        header: 'Satuan',
        field: 'satuan',
        type: 'text',
        width: 150,
        format: '0,0',        
        editor:false
        
    }, 
    {
        header: 'Harga Satuan PAK',
        type: 'numeric',
        field: 'harga_satuan_pak',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,        
        editor:false
    },
    
    {
        header: 'Anggaran Setelah PAK',
        type: 'numeric',
        field: 'anggaran_pak',
        width: 220,
        format: '0,0',
        renderer :renderers.anggaranPAKRenderer, 
        editor:false
    },
    {
        header: 'Perubahan',
        type: 'numeric',
        field: 'perubahan',
        width: 220,
        format: '0,0',
        renderer :renderers.perubahanRenderer, 
        editor:false
    }
]
