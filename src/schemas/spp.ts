import * as renderers from './renderers';

export default [
    {
        header: 'Kode Urut',
        type: 'text',
        width: 200
    },    
    {
        header: 'No (Kode /Bukti /Potongan)',
        type: 'text',
        width: 230,
    },
    {
        header: 'Uraian', 
        type: 'text',
        width: 450,        
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
        header: 'Kategori',
        type: 'text',
        width: 200
    }
]
