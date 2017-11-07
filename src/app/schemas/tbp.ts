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
        header: 'Kode Desa',
        type: 'text',
        field:'kode_desa',
        hiddenColumn: true
    },
    {
        header: 'Tahun',
        type: 'text',
        field:'tahun',
        hiddenColumn: true
    },
    {
        header: 'Tanggal',
        type: 'date',
        field:'tanggal',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/2015',
    },
    {
        header: 'Uraian',
        type: 'text',
        field:'uraian',
        width: 450
    },
    {
        header: 'Penyetor',
        type: 'text',
        field:'nama_penyetor',
    },
    {
        header: 'Alamat',
        type: 'text',
        field:'alamat_penyetor',
    },
    {
        header: 'TTD',
        type: 'text',
        field:'ttd_penyetor',
    },
    {
        header: 'No Rekening',
        type: 'text',
        field:'rekening_bank',
    },
    {
        header: 'Bank',
        type: 'text',
        field:'nama_bank',
    },
    {
        header: 'Jumlah',
        type: 'numeric',
        field:'jumlah',
        format: '0,0',
        renderer: renderers.rupiahRenderer,
        editor: false
    },
    {
        header: 'Bendahara',
        type: 'text',
        field:'nama_bendahara',
        hiddenColumn: true
    },
    {
        header: 'Jabatan',
        type: 'text',
        field:'jabatan_bendahara',
        hiddenColumn: true
    },
    {
        header: 'Status',
        type: 'text',
        field:'status',
        hiddenColumn: true
    },
    {
        header: 'Kode Bayar',
        type: 'text',
        field:'kode_bayar',
        editor: false,
        renderer: renderers.unEditableRenderer
    },
    {
        header: 'Ref',
        type: 'text',
        field:'ref_bayar',
        hiddenColumn: true
    },
];

export default schema;
