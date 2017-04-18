import * as renderers from './renderers';
export default [
    {
        header: 'ID',
        field: '', 
        type: 'text',
        width:200
    },
    {
        header: 'Kode',
        field: '', 
        type: 'text',
        width:150,
        renderer:renderers.uraianRenstraRenderer
        
    },
    {
        header: 'Uraian',
        field: '', 
        type: 'text',
        width: 900
    }
];
