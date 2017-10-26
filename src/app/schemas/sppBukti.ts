import * as renderers from './renderers';
import { SchemaColumn } from "./schema";

let schema: SchemaColumn[] = [
    {
        header: 'No',
        type: 'text',
        field:'no',
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kode Rincian',
        type: 'text',
        field:'kode_rincian',
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'No SPP',
        type: 'text',
        field:'no_spp',
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kode Desa',
        type: 'text',
        field:'kode_desa',
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Tahun',
        type: 'text',
        field:'tahun',
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
        header: 'Tanggal',
        field:'tanggal',
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/2015',
        width: 120,
    },
    {
        header: 'Nilai',
        field:'nilai',
        type: 'numeric',
        width: 150,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
    {
        header: 'Penerima',
        type: 'text',
        field:'nama_penerima',
    },
    {
        header: 'Alamat',
        type: 'text',
        field:'alamat'
    },
    
    {
        header: 'Rek_Bank',
        type: 'text',
        field:'rekening_bank',
    },
    {
        header: 'Bank',
        type: 'text',
        field:'nama_bank',
    },
    {
        header: 'NPWP',
        type: 'text',
        field:'npwp',
    },
    {
        header: 'Keterangan',
        type: 'text',
        field:'keterangan',
    },
];

export default schema;
