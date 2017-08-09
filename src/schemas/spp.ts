import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        type: 'text',
        field:'id',
        width: 230,
        hiddenColumn:false,
    },
    {
        header: 'No (Kode /Bukti /Potongan)',
        type: 'text',
        field:'code',
        width: 230,
        renderer: renderers.uraianSPPRenderer,        
        editor:false
    },
    {
        header: 'Uraian', 
        type: 'text',
        field:'uraian',
        width: 450,  
        renderer: renderers.uraianSPPRenderer,     
    },
    {
        header: 'Tanggal', 
        
        field:'date',
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 120,      
    },   
    {
        header: 'SumberDana',
        type: 'text',
        field:'sumberdana',
        width: 200,
    },
    {
        header: 'Anggaran',
        type: 'numeric',
        field:'anggaran',
        width: 220,
        format: '0,0',     
        renderer: renderers.anggaranSPPRenderer
    },
    {
        header: 'Nama Penerima',
        type: 'text',
        field:'Nm_Penerima',
        width: 200
    },
    {
        header: 'Alamat',
        type: 'text',
        field:'Alamat',
        width: 200
    },
    {
        header: 'Nama BANK',
        type: 'text',
        field:'Nm_Bank',
        width: 200
    },
    {
        header: 'Rek BANK',
        type: 'text',
        field:'Rek_Bank',
        width: 200
    },
    {
        header: 'NPWP',
        type: 'text',
        field:'NPWP',
        width: 200
    },

]
