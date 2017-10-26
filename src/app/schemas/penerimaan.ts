import * as renderers from './renderers';
import { SchemaColumn } from "./schema";

let schema: SchemaColumn[] = [
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
        field: 'Nm_Penyetor',
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
        header: 'No Rekening',
        type: 'text',
        field: 'NoRek_Bank',
        width: 220,
    },          
    {
        header: 'Nama Bank',
        field: 'Nama_Bank',
        type: 'text',
        width: 150,
    }
];

export default schema;