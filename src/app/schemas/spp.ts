import * as renderers from './renderers';

export default [
    {
        header: 'No',
        type: 'text',
        field:'no',
    },
    {
        header: 'Kode Desa',
        type: 'text',
        field:'kode_desa',
    },
    {
        header: 'Tahun',
        type: 'text',
        field:'tahun',
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
        header: 'Jenis',
        type: 'text',
        field:'jenis',
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
    },
    {
        header: 'Potongan',
        field:'potongan',
        type: 'numeric',
        width: 150,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
]
