export const FIELD_ALIASES = {
    kegiatan: { 
        'kode_kegiatan':'Kd_Keg', 'nama_kegiatan': 'Nama_Kegiatan', 'kode_bidang': 'Kd_Bid', 'nama_bidang': 'Nama_Bidang', 'lokasi': 'Lokasi', 'waktu': 'Waktu', 'nama_pptkd': 'Nm_PPTKD', 'keluaran': 'Keluaran','pagu': 'Pagu', 'pagu_pak': 'Pagu_PAK'
    },
    rab: {
        'kode_rekening': 'Kode_Rekening', 'kode_kegiatan': 'Kd_Keg', 'uraian': 'Uraian', 'sumber_dana': 'SumberDana', 'jumlah_satuan': 'JmlSatuan', 'satuan': 'Satuan', 'harga_satuan': 'HrgSatuan',
        'anggaran': 'Anggaran', 'jumlah_satuan_pak': 'JmlSatuanPAK', 'harga_satuan_pak': 'HrgSatuanPAK', 'anggaran_pak': 'AnggaranStlhPAK', 'perubahan': 'AnggaranPAK'
    }
}

export function fromSiskeudes(source, aliases){
    let result = {};
    let keys = Object.keys(aliases); 
    keys.forEach(key => {
        result[key] = source[aliases[key]];
    })
    return result;
}