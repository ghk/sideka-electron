import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        field: 'Id', 
        width: 200,
        type: 'text',        
        hiddenColumn:true,
    },
    {
        header: 'No Bukti / No TBP',
        field: 'Code', 
        type: 'text',
        width: 150,
        renderer: renderers.uraianPenyetoranRenderer
    },
    {
        header: 'Uraian / Rincian',
        type: 'text',
        field: 'Uraian',
        width: 450,
        renderer: renderers.uraianPenyetoranRenderer
    },
    {
        header: 'Anggaran',
        type: 'numeric',
        field: 'Nilai',        
        format: '0,0',
        width: 220,
        renderer: renderers.anggaranPenerimaanRenderer
    },  
    {
        header: 'Tanggal',
        field: 'Tgl_Bukti', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 120,
    },   
    {
        header: 'No Rekening',
        type: 'numeric',
        field: 'NoRek_Bank',
        width: 220,
        format: '0,0',
    },          
    {
        header: 'Nama Bank',
        field: 'Nama_Bank',
        type: 'numeric',
        width: 150,
        format: '0,0'
    }
]
