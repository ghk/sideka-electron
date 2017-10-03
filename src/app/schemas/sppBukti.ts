import * as renderers from './renderers';
export default [
    {
        header: 'No',
        type: 'text',
        field:'no',
    },
    {
        header: 'Kode Rincian',
        type: 'text',
        field:'kode_rincian',
    },
    {
        header: 'No SPP',
        type: 'text',
        field:'no_spp',
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
        header: 'Kegiatan',
        type: 'text',
        field:'kode_kegiatan',
    },
    {
        header: 'Sumber Dana',
        type: 'text',
        field:'sumber_dana',
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
        width: 220,
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
]
