import * as renderers from './renderers';
export default [
    {
        header: 'Kode',
        field: 'code',
        type: 'text',
        width: 200,
        editor: false
    },
    {
        header: 'Kategori',
        field: 'category',
        type: 'text',
        width: 150,
        renderer: renderers.uraianRenstraRenderer,
        editor: false

    },
    {
        header: 'Uraian',
        field: 'uraian',
        type: 'text',
        width: 900,
        renderer: renderers.uraianRenstraRenderer
    }
];
