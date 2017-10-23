import * as renderers from './renderers';
import { SchemaColumn } from "./schema";

let schema: SchemaColumn[] = [
    {
        header: 'Id',
        field: 'id', 
        width: 220,
        type: 'text',        
        hiddenColumn:true,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kode Bidang',
        field: 'kode_bidang', 
        type: 'text',
        width: 90,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Nama Bidang',
        field: 'nama_bidang', 
        type: 'text',
        width: 250,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kode Kegiatan',
        field: 'kode_kegiatan', 
        type: 'text',
        width: 110,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Nama Kegiatan',
        field: 'nama_kegiatan', 
        type: 'text',
        width: 300,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Lokasi',
        field: 'lokasi_spesifik', 
        type: 'text',
        width: 120,
    },
    {
        header: 'Volume',
        field: 'volume', 
        type:'numeric',
        width: 70,
        defaultData: 0
        
    },
    {
        header: 'Satuan',
        field: 'satuan', 
        type: 'text',
        width: 90,
    },
    {
        header: 'Jml Pria',
        field: 'jumlah_sasaran_pria',
        type: 'numeric',
        width: 90,
        format: '0,0',
        defaultData: 0
    },
    {
        header: 'Jml Wanita',
        field: 'jumlah_sasaran_wanita', 
        type: 'numeric',
        width: 90,
        format: '0,0',
        defaultData: 0
    },    
    {
        header: 'Jml ARTM',
        field: 'jumlah_sasaran_rumah_tangga', 
        type: 'numeric',
        width: 90,
        format: '0,0',
        defaultData: 0
    },
    {
        header: 'Sbr',
        field: 'sumber_dana', 
        type: 'dropdown',
        width: 90,
        source: []
    },
    {
        header: 'Waktu',
        field: 'waktu', 
        type: 'text',
        width: 100,
    },
    {
        header: 'Mulai',
        field: 'tanggal_mulai', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/2000',
        width: 90,
    },
    {
        header: 'Selesai',
        field: 'tanggal_selesai', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/2000',
        width: 90,
    },
    {
        header: 'Biaya',
        field:'anggaran',
        type: 'numeric',
        width: 170,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },    
    {
        header: 'Pola Kegiatan',
        field: 'pola_kegiatan', 
        type: 'dropdown',
        source: ['Swakelola', 'Kerjasama', 'Pihak Ketiga'],
        width: 130,
    },  
    {
        header: 'Pelaksana',
        field: 'pelaksana',
        type: 'text',
        width: 200,
    },
    {
        header: 'Kd_Tahun',
        field: 'kode_tahun', 
        width: 0,
        type: 'text',        
        hiddenColumn:true
    },
];

export default schema;