import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        type: 'text',
        field:'id',
        hiddenColumn: true
    },
    {
        header: 'Kode',
        type: 'text',
        field:'kode',
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
        header: 'Nilai',
        type: 'numeric',
        field:'nilai',
        width: 150,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
]
