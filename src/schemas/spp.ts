import * as renderers from './renderers';

export default [
    {
        header: 'Kode Urut',
        type: 'text',
        width: 100,
        hiddenColumn:true
    }, 
    {
        header: 'No (Kode /Bukti /Potongan)',
        type: 'text',
        width: 230,
        renderer: renderers.uraianRenderer, 
    },
    {
        header: 'Uraian', 
        type: 'text',
        width: 450,  
        renderer: renderers.uraianRenderer,      
    },
    {
        header: 'Tanggal', 
        type: 'text',
        width: 150,        
    },   
    {
        header: 'SumberDana',
        type: 'text',
        width: 200,
    },
    {
        header: 'Anggaran',
        type: 'numeric',
        width: 220,
        format: '0,0',     
        renderer: renderers.anggaranRenderer
    },
    {
        header: 'Nama Penerima',
        type: 'text',
        width: 200
    },
    {
        header: 'Alamat',
        type: 'text',
        width: 200
    },
    {
        header: 'Nama BANK',
        type: 'text',
        width: 200
    },
    {
        header: 'Rek BANK',
        type: 'text',
        width: 200
    },
    {
        header: 'NPWP',
        type: 'text',
        width: 200
    },

]
