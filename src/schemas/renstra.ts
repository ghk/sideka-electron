import * as renderers from './renderers';
export default [
    {
        header: 'Kode',
        field: '',
        type: 'text',
        width: 200,
        editor: false
    },
    {
        header: 'Kategori',
        field: '',
        type: 'text',
        width: 150,
        renderer: renderers.uraianRenstraRenderer,
        editor: false

    },
    {
        header: 'Uraian',
        field: '',
        type: 'text',
        width: 900,
        renderer: renderers.uraianRenstraRenderer
    }
];
