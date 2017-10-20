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
        width: 150,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Nama Bidang',
        field: 'nama_bidang', 
        type: 'text',
        width: 300,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kode Kegiatan',
        field: 'kode_kegiatan', 
        type: 'text',
        width: 150,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Nama Kegiatan',
        field: 'nama_kegiatan', 
        type: 'text',
        width: 500,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kode Sasaran',
        field: 'kode_sasaran', 
        type:'text',
        width: 220,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Sasaran Renstra',
        field: 'uraian_sasaran', 
        type: 'text',
        width: 600,
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
        header: 'Sasaran',
        field: 'sasaran', 
        type: 'text',
        width: 300,
    },
    {
        header: 'Keluaran',
        field: 'keluaran', 
        type: 'text',
        width: 300
    },
    {
        header: 'Tahun 1',
        field: 'tahun_1',
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
    },
    {
        header: 'Tahun 2',
        field: 'tahun_2', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
    },
    {
        header: 'Tahun 3',
        field: 'tahun_3', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
        
    },
    {
        header: 'Tahun 4',
        field: 'tahun_4', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
        
    },
    {
        header: 'Tahun 5',
        field: 'tahun_5', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
    },
    {
        header: 'Tahun 6',
        field: 'tahun_6', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 80,
    },
    {
        header: 'Swakelola',
        field: 'swakelola', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 100,
    },    
    {
        header: 'Kerjasama',
        field: 'kerjasama', 
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 100,
    },
    {
        header: 'Pihak Ketiga',
        field: 'pihak_ketiga',
        type: 'checkbox',
        checkedTemplate: true,
        uncheckedTemplate: false,
        width: 100,
    }
];

export default schema;