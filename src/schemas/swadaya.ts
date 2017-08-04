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
        header: 'No Bukti / Kode Rincian',
        field: 'Code', 
        type: 'text',
        width: 200,
        renderer: renderers.uraianPenerimaanRenderer
    },
    {
        header: 'Uraian / Rincian',
        type: 'text',
        field: 'Uraian',
        width: 450,
        renderer: renderers.uraianPenerimaanRenderer
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
        header: 'Sumber Dana',
        field: 'SumberDana',
        type: 'dropdown',
        width: 150,
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
        header: 'Nama Penyetor',
        field: 'Nama_Penyetor',
        type: 'text',
        width: 150,
        
    },
    {
        header: 'Alamat Penyetor',
        field: 'Alamat_Penyetor',
        type: 'text',
        width: 150,
        
    },   
    {
        header: 'TTD Penyetor',
        type: 'text',
        field: 'TTD_Penyetor',
        width: 220,
    },
    {
        header: 'Kode Kegiatan',
        field: 'Kd_Keg',
        type: 'text',
        width: 150,
        
    },   
    {
        header: 'Nama Kegiatan',
        type: 'text',
        field: 'Nama_Kegiatan',
        width: 220,
    }
]
