import * as renderers from './renderers';
export default [
    {
        header: 'Id',
        field: 'id', 
        width: 220,
        type: 'text',        
        hiddenColumn:true,
        editor:false
    },
    {
        header: 'Kode Bidang',
        field: 'Kd_Bid', 
        type: 'text',
        width: 120,
        editor:false
    },
    {
        header: 'Nama Bidang',
        field: 'Nama_Bidang', 
        type: 'text',
        width: 300,
        editor:false
    },
    {
        header: 'Kode Kegiatan',
        field: 'Kd_Keg', 
        type: 'text',
        width: 120,
        editor:false
    },
    {
        header: 'Nama Kegiatan',
        field: 'Nama_Kegiatan', 
        type: 'text',
        width: 300,
        editor:false
    },
    {
        header: 'Lokasi',
        field: 'Lokasi', 
        type: 'text',
        width: 200,
    },
    {
        header: 'Waktu',
        field: 'Waktu', 
        type:'numeric',
        width: 120,
        defaultData: 0
        
    },
    {
        header: 'Nama PPTKD',
        field: 'Nm_PPTKD', 
        type: 'text',
        width: 100,
    },
    {
        header: 'Keluaran',
        field: 'Keluaran',
        type: 'text',
        width: 300,
    },
    {
        header: 'Pagu',
        field: 'Pagu', 
        type: 'numeric',
        width: 200,
        format: '0,0',
        defaultData: 0
    },    
    {
        header: 'Pagu',
        field: 'Pagu_PAK', 
        type: 'numeric',
        width: 200,
        format: '0,0',
        defaultData: 0
    },
]