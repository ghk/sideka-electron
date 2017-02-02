import * as renderers from './renderers';

export default [
    {
        header: 'Kode Rekening',
        field: 'kode_rekening', 
        type: 'text',
        width: 100,
        renderer: renderers.monospaceRenderer,
        validator: renderers.kodeRekeningValidator,
    },
    {
        header: 'Uraian',
        field: 'uraian', 
        type: 'text',
        width: 450,
        renderer: renderers.uraianRenderer,
    },
    {
        header: 'Anggaran',
        field: 'anggaran', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        language: 'id-ID' ,
        validator: renderers.anggaranValidator,
        renderer: renderers.anggaranRenderer
        
    },
    {
        header: 'Keterangan',
        field: 'keterangan', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Kategori',
        field: 'kategori', 
        type: 'dropdown',
        source: ['', 'Kesehatan', 'Pendidikan', 'Jalan', 'Pertanian', 'Perikanan', 'Pariwisata', 'Kantor Desa']
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
