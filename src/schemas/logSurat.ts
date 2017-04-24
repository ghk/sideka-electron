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
        type: 'text'
    },{
        header: 'Nama Penduduk',
        field: 'nama_penduduk', 
        width: 250,
        type: 'text'
    },{
        header: 'Jenis Surat',
        field: 'jenis_surat', 
        width: 250,
        type: 'text'
    },{
        header: 'Tanggal Cetak',
        field: 'tanggal_cetak', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 120,
    },{
        header: 'Nama File',
        field: 'nama_file', 
        width: 250,
        type: 'text'
    }
]
