import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        field: 'Id', 
        width: 0,
        type: 'text'
    },
    {
        header: 'No Bukti / Kode Rincian',
        field: 'Code', 
        type: 'text',
        width: 150
    },
    {
        header: 'Uraian / Rincian',
        type: 'text',
        field: 'Uraian',
        width: 170,
    },
    {
        header: 'Anggaran',
        type: 'numeric',
        field: 'Anggaran',        
        format: '0,0',
        width: 450,
    },
    {
        header: 'Sumber Dana',
        field: 'SumberDana',
        type: 'dropdown',
        width: 120,
    },    
    {
        header: 'Tanggal',
        field: 'Tgl_Bukti', 
        width: 0,
        type: 'text',
    },
    {
        header: 'Nama Penyetor',
        field: 'Nm_Penyetor',
        type: 'text',
        width: 120,
        
    },
    {
        header: 'Alamat Penyetor',
        field: 'Alamat_Penyetor',
        type: 'text',
        width: 100,
        
    },   
    {
        header: 'TTD Penyetor',
        type: 'text',
        field: 'TTD_Penyetor',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
        editor: 'text'
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
