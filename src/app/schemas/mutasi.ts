export default [
    {
        header: 'Id',
        field: 'id', 
        width: 0,
        type: 'text',
        readOnly: true
    },{
        header: 'NIK',
        field: 'nik', 
        width: 140,
        type: 'text',
        readOnly: true
    },{
        header: 'Nama Penduduk',
        field: 'nama_penduduk', 
        width: 250,
        type: 'text',
        readOnly: true
    },{
        header: 'Jenis Mutasi',
        field: 'jenis_mutasi', 
        width: 250,
        type: 'text',
        readOnly: true
    },{
        header: 'Dari/Ke Desa',
        field: 'desa', 
        width: 250,
        type: 'text',
        readOnly: true
    },{
        header: 'Tanggal Mutasi',
        field: 'tanggal_mutasi', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 120,
        readOnly: true
    }
]
