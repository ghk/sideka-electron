import * as renderers from './renderers';
import { SchemaColumn } from "./schema";

let schema: SchemaColumn[] = [
    {
        header: 'Kode',
        field: 'code',
        type: 'text',
        width: 110,
        renderer: renderers.unEditableRenderer,
        editor: false
    },
    {
        header: 'Kategori',
        field: 'category',
        type: 'text',
        width: 100,
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

export default schema;