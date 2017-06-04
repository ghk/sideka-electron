import * as renderers from './renderers';

export default [
    {
        header: 'Kode',
        type: 'text',
        field:'kode_rekening',
        width: 100,
        hiddenColumn:true,
        renderer: renderers.monospaceRenderer,
    }, 
    {
        header: 'No (Kode /Bukti /Potongan)',
        type: 'text',
        field:'no',
        width: 230,
        renderer: renderers.uraianRenderer,
    },
    {
        header: 'Uraian', 
        type: 'text',
        field:'uraian',
        width: 450,  
        renderer: renderers.uraianRenderer,     
    },
    {
        header: 'Tanggal', 
        type: 'date',
        field:'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 120        
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
        renderer: renderers.anggaranRenderer
    },
    {
        header: 'Nama Penerima',
        type: 'text',
        field:'nama_penerima',
        width: 200
    },
    {
        header: 'Alamat',
        type: 'text',
        field:'alamat',
        width: 200
    },
    {
        header: 'Nama BANK',
        type: 'text',
        field:'nama_bank',
        width: 200
    },
    {
        header: 'Rek BANK',
        type: 'text',
        field:'rek_bank',
        width: 200
    },
    {
        header: 'NPWP',
        type: 'text',
        field:'npwp',
        width: 200
    },

]
