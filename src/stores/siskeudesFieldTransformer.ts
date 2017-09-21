export const FIELD_ALIASES = {
    kegiatan: { 
        'kode_kegiatan':'Kd_Keg', 'nama_kegiatan': 'Nama_Kegiatan', 'kode_bidang': 'Kd_Bid', 'nama_bidang': 'Nama_Bidang', 'lokasi': 'Lokasi', 'waktu': 'Waktu', 'nama_pptkd': 'Nm_PPTKD', 'keluaran': 'Keluaran','pagu': 'Pagu', 'pagu_pak': 'Pagu_PAK'
    },
    rab: {
        'kode_rekening': 'Kode_Rekening', 'kode_kegiatan': 'Kd_Keg', 'uraian': 'Uraian', 'sumber_dana': 'SumberDana', 'jumlah_satuan': 'JmlSatuan', 'satuan': 'Satuan', 'harga_satuan': 'HrgSatuan',
        'anggaran': 'Anggaran', 'jumlah_satuan_pak': 'JmlSatuanPAK', 'harga_satuan_pak': 'HrgSatuanPAK', 'anggaran_pak': 'AnggaranStlhPAK', 'perubahan': 'AnggaranPAK'
    },
    spp: {
        'no': 'No_SPP', 'tanggal': 'Tgl_SPP', 'jenis': 'Jn_SPP', 'keterangan': 'Keterangan',
        'jumlah': 'Jumlah', 'potongan': 'Potongan', 'tahun': 'Tahun', 'kode_desa': 'Kd_Desa'
    }
}

const querySPP = `SELECT    Ta_SPP.No_SPP, Format(Ta_SPP.Tgl_SPP, 'dd/mm/yyyy') AS Tgl_SPP, Ta_SPP.Jn_SPP, Ta_SPP.Keterangan, Ta_SPP.Jumlah, Ta_SPP.Potongan, Ta_SPP.Tahun, Ds.Kd_Desa
                  FROM      (Ta_Desa Ds INNER JOIN Ta_SPP ON Ds.Kd_Desa = Ta_SPP.Kd_Desa) `;

export function fromSiskeudes(source, aliases){
    let result = {};
    let keys = Object.keys(source); 
    keys.forEach(key => {
        if(!aliases[key]){
            console.log("no alias for: ", key, aliases);
            return;
        }
        result[key] = source[aliases[key]];
    })
    return result;
}

export function valueToPropName(obj): any{
    let result = {};
    Object.keys(obj).forEach(key => {
        result[obj[key]] = key
    });
    return result
}
