import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        type: 'text',
        field:'id',
        hiddenColumn: true
    },
    {
        header: 'No TBP',
        type: 'text',
        field:'no_tbp',
    },
    {
        header: 'Kode',
        type: 'text',
        field:'kode'
    },  
    {
        header: 'Nama Rekening',
        type: 'text',
        field:'nama_rekening'
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
        header: 'Kegiatan',
        type: 'text',
        field:'kode_kegiatan',
        hiddenColumn: true
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
        renderer: renderers.rupiahRenderer
    }
]
