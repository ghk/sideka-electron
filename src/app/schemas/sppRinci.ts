import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        type: 'text',
        field:'id',
        hiddenColumn: true,
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
        header: 'Nilai',
        type: 'numeric',
        field:'nilai',
        width: 150,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },
]
