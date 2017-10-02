import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        field: 'id', 
        width: 0,
        type: 'text',
        readOnly: true
    },{
        header: 'Feature ID',
        field: 'feature_id', 
        width: 250,
        type: 'text',
        readOnly: true
    },{
        header: 'Tahun',
        field: 'tahun', 
        width: 140,
        type: 'text',
        readOnly: true
    },{
        header: 'Jenis',
        field: 'type', 
        width: 140,
        type: 'text',
        readOnly: true
    },{
        header: 'Kode RAB',
        field: 'kode_rab', 
        width: 250,
        type: 'text',
        renderer: renderers.rabRenderer,
        readOnly: true
    },{
        header: 'Dari',
        field: 'old_properties', 
        width: 250,
        type: 'text',
        renderer: renderers.propertiesRenderer,
        readOnly: true
    },{
        header: 'Menjadi',
        field: 'new_properties', 
        width: 250,
        type: 'text',
        renderer: renderers.propertiesRenderer,
        readOnly: true
    },{
        header: 'Nilai',
        field: 'value', 
        width: 250,
        type: 'numeric'
    }
];
