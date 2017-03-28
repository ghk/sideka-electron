import * as renderers from './renderers';

export default [
    {
        header: 'No',
        field: 'no', 
        type: 'text',
        readOnly: true,
        width: 70,
        renderer: renderers.monospaceRenderer
    },
    {
        header: 'Indikator',
        field: 'indikator', 
        type: 'text',        
        readOnly: true,
        width: 400,
    },
    {
        header: 'Nilai',
        field: 'nilai', 
        type: 'numeric',
        width: 100,
    },
    {
        header: 'Satuan',
        field: 'satuan', 
        type: 'text',
        readOnly: true,
        width: 200,
    },
    {
        header: 'Sasaran Nasional',
        field: 'sasaran_nasional', 
        type: 'text',        
        readOnly: true,
        width: 1400,
    },
];


