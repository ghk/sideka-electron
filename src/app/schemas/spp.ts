import * as renderers from './renderers';
import { SchemaColumn } from "./schema";

let schema: SchemaColumn[] = [
    {
        header: 'No',
        type: 'text',
        field:'no',
        renderer: renderers.linkDetailRenderer,
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
        header: 'Keterangan',
        type: 'text',
        field:'keterangan',
        width: 450
    },
    {
        header: 'Jumlah',
        field: 'jumlah',
        type: 'numeric',
        width: 150,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
        editor: false
    },
    {
        header: 'Potongan',
        field:'potongan',
        type: 'numeric',
        width: 150,
        renderer :renderers.rupiahRenderer,
        editor: false
    },
    {
        header: 'Jenis',
        type: 'text',
        field:'jenis',
        editor: false,
        renderer: renderers.unEditableRenderer
    },
    {
        header: 'Status',
        type: 'text',
        field:'status',
        hiddenColumn: true,
    },
];

export default schema;
