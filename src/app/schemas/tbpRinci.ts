import * as renderers from './renderers';
import { SchemaColumn } from "./schema";

let schema: SchemaColumn[] = [
    {
        header: 'Id',
        type: 'text',
        field:'id',
        hiddenColumn: true,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'No TBP',
        type: 'text',
        field:'no_tbp',
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kode',
        type: 'text',
        field:'kode',
        renderer: renderers.unEditableRenderer,
        editor: false
    },  
    {
        header: 'Nama Rekening',
        type: 'text',
        field:'nama_rekening',
        width: 300,
        renderer: renderers.unEditableRenderer,
        editor: false
    },    
    {
        header: 'Kode Desa',
        type: 'text',
        field:'kode_desa',
        hiddenColumn: true,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Tahun',
        type: 'text',
        field:'tahun',
        hiddenColumn: true,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Rincian Sumberdana',
        type: 'text',
        field:'rincian_sumber_dana',
        hiddenColumn: true,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kegiatan',
        type: 'text',
        field:'kode_kegiatan',
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Sumber Dana',
        type: 'text',
        field:'sumber_dana',
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Nilai',
        field:'nilai',
        type: 'numeric',
        format: '0,0',
        renderer: renderers.rupiahRenderer
    }
];

export default schema;