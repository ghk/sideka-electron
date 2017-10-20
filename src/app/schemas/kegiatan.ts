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
        width: 120,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Nama Bidang',
        field: 'nama_bidang', 
        type: 'text',
        width: 350,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kode Kegiatan',
        field: 'kode_kegiatan', 
        type: 'text',
        width: 120,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Nama Kegiatan',
        field: 'nama_kegiatan', 
        type: 'text',
        width: 350,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Lokasi',
        field: 'lokasi', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Waktu',
        field: 'waktu', 
        type:'text',
        width: 120
        
    },
    {
        header: 'Nama PPTKD',
        field: 'nama_pptkd', 
        type: 'text',
        width: 100,
    },
    {
        header: 'Keluaran',
        field: 'keluaran',
        type: 'text',
        width: 300,
    },
    {
        header: 'Pagu',
        field: 'pagu', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        defaultData: 0,
        renderer: renderers.rupiahRenderer
    },    
    {
        header: 'Pagu PAK',
        field: 'pagu_pak', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        defaultData: 0,
        renderer: renderers.rupiahRenderer        
    },
];

export default schema;