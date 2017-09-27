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
        type: 'text',
        field:'tanggal',
    },
    {
        header: 'Uraian',
        type: 'text',
        field:'uraian',
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
        field:'ttd',
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
        type: 'text',
        field:'jumlah',
        renderer: renderers.rupiahRenderer
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
    },
    {
        header: 'Ref',
        type: 'text',
        field:'ref_bayar',
        hiddenColumn: true
    },
]
