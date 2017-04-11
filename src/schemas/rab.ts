import * as renderers from './renderers';

export default [
    {
        header: 'Kode',
        field: 'kode_rekening', 
        type: 'text',
        width: 100
    },
    {
        header: 'Uraian',
        field: 'uraian', 
        type: 'text',
        width: 450,
        renderer: renderers.uraianRenderer,
    },
    {
        header: 'Volume',
        field: 'anggaran', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        language: 'id-ID' ,
        renderer: renderers.anggaranRenderer
        
    },
    {
        header: 'Harga Satuan',
         field: 'anggaran', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        language: 'id-ID' ,
        renderer: renderers.anggaranRenderer
    },
    {
        header: 'Jumlah',
        field: 'kategori', 
        type: 'dropdown',
        width: 200
    },
]

var indikatorSchema = [
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
