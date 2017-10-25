import * as renderers from './renderers';
import { SchemaColumn } from "./schema";

let schema: SchemaColumn[] = [
    {
        header: 'Id',
        field: 'id', 
        width: 250,
        type: 'text',
        hiddenColumn:true,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Rekening',
        field: 'kode_rekening', 
        type: 'text',
        width: 80,        
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kegiatan',
        type: 'text',
        field: 'kode_kegiatan',
        width: 80,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Uraian',
        type: 'text',
        field: 'uraian',
        width: 400,
        renderer: renderers.uraianRABRenderer,
    },
    {
        header: 'Sbr',
        field: 'sumber_dana',
        type: 'dropdown',
        width: 60,
        source: [],
        renderer: renderers.rabUnEditableRenderer,
    },
    {
        header: 'Jml',
        field: 'jumlah_satuan',
        type: 'numeric',
        width: 60,
        format: '0,0',
        renderer: renderers.rabUnEditableRenderer,
        editor: 'text',
    },
    {
        header: 'Stn',
        field: 'satuan',
        type: 'text',
        width: 60,
        format: '0,0',
        renderer: renderers.rabUnEditableRenderer,
        editor: 'text',    
    },   
    {
        header: 'Harga Satuan',
        type: 'numeric',
        field: 'harga_satuan',
        width: 150,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
        editor: 'text'
    },
    {
        header: 'Anggaran',
        type: 'numeric',
        field: 'anggaran',
        width: 150,
        format: '0,0',
        //renderer : renderers.anggaranRenderer,
        editor:false,
    },          
    {
        header: 'Jumlah PAK',
        field: 'jumlah_satuan_pak',
        type: 'numeric',
        width: 80,
        format: '0,0',
        renderer: renderers.rabUnEditableRenderer,        
        editor:false
        
    },
    {
        header: 'Satuan',
        field: 'satuan',
        type: 'text',
        width: 150,
        format: '0,0',
        renderer: renderers.rabUnEditableRenderer, 
        editor:false
        
    }, 
    {
        header: 'Harga Satuan PAK',
        type: 'numeric',
        field: 'harga_satuan_pak',
        width: 150,
        format: '0,0',
        renderer :renderers.rupiahRenderer,        
        editor:false
    },
    
    {
        header: 'Anggaran Setelah PAK',
        type: 'numeric',
        field: 'anggaran_pak',
        width: 150,
        format: '0,0',
        //renderer :renderers.anggaranPAKRenderer, 
        editor:false
    },
    {
        header: 'Perubahan',
        type: 'numeric',
        field: 'perubahan',
        width: 150,
        format: '0,0',
        //renderer :renderers.perubahanRenderer, 
        editor:false
    }
];

export default schema;
