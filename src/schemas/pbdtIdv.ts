import * as renderers from './renderers';

export default [
    {
        header: 'Id',
        field: 'id', 
        width: 0,
        type: 'text',
        readOnly: true
    },
     {
        header: 'Kode Wilayah',
        field: 'kode_wilayah',
        width: 250,
        type: 'text'
    },
    {
        header: 'Provinsi',
        field: 'provinsi',
        width: 250,
        type: 'text'
    },
    {
        header: 'Kabupaten/Kota',
        field: 'kabupaten',
        width: 250,
        type: 'text'
    },
    {
        header: 'Kecamatan',
        field: 'kecamatan',
        width: 250,
        type: 'text'
    },
    {
        header: 'Desa/Kelurahan',
        field: 'desa_kelurahan',
        width: 250,
        type: 'text'
    },
    {
        header: 'Alamat',
        field: 'alamat',
        width: 250,
        type: 'text'
    },
    {
        header: 'Nama',
        field: 'nama',
        width: 250,
        type: 'text'
    },
    {
        header: 'NIK',
        field: 'nik',
        width: 100,
        type: 'text'
    },
    {
        header: 'Nomor Urut Anggota Rumah Tangga',
        field: 'nomor_urut_anggota_rumah_tangga',
        width: 100,
        type: 'text'
    },
    {
        header: 'Hubungan dengan Kepala Rumah Tangga',
        field: 'hubungan_dengan_kepala_rumah_tangga',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 1,
                label: 'Kepala keluarga'
            },{
                id: 2,
                label: 'Istri/Suami'
            },{
                id: 3,
                label: 'Anak'
            },{
                id: 4,
                label: 'Menantu'
            },{
                id: 5,
                label: 'Cucu'
            },{
                id: 6,
                label: 'Orang tua/Mertua'
            },{
                id: 7,
                label: 'Pembantu ruta'
            },{
                id: 8,
                label: 'Lainnya'
        }],
        width: 250,
        type: 'text'
    },
    {
        header: 'Nomor Urut Keluarga',
        field: 'nomor_urut_keluarga',
        width: 100,
        type: 'text'
    },
    {
        header: 'Hubungan dengan Kepala Keluarga',
        field: 'hubungan_dengan_kepala_keluarga',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 1,
                label: 'Kepala keluarga'
            },{
                id: 2,
                label: 'Istri/Suami'
            },{
                id: 3,
                label: 'Anak'
            },{
                id: 4,
                label: 'Menantu'
            },{
                id: 5,
                label: 'Cucu'
            },{
                id: 6,
                label: 'Orang tua/Mertua'
            },{
                id: 7,
                label: 'Pembantu ruta'
            },{
                id: 8,
                label: 'Lainnya'
        }],
        width: 100,
        type: 'text'
    },
    {
        header: 'Jenis Kelamin',
        field: 'jenis_kelamin',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
            id: 1,
            label: 'Laki-Laki'
        },{
            id: 2,
            label: 'Perempuan'
        }],
        width: 200,
        type: 'text'
    },
    {
        header: 'Umur Saat Pendataan',
        field: 'umur',
        width: 100,
        type: 'text'
    },
    {
        header: 'Status Perkawinan',
        field: 'status_perkawinan',
        renderer: renderers.keyValuePairRenderer,
        originData:[{
                id: 1,
                label: 'Belum kawin'
            },{
                id: 2,
                label: 'Kawin/Nikah'
            },{
                id: 3,
                label: 'Cerai hidup'
            },{
                id: 4,
                label: 'Cerai mati'
        }],
        width: 100,
        type: 'text'
    },
    {
        header: 'Kepemilikan buku Nikah/Cerai',
        field: 'kepemilikan_buku_nikah_cerai',
        renderer: renderers.keyValuePairRenderer,
        origindata: [{
                id: 0,
                label: 'Tidak ada'
            },{
                id: 1,
                label: 'Ya, dapat ditunjukkan'
            },{
                id: 2,
                label: 'Ya, tidak dapat ditunjukkan'
        }],
        width: 200,
        type: 'text'
    },{
        header: 'Tercantum Dalam KK',
        field: 'tercantum_dalam_kk',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }],
        width: 150,
        type: 'text'
    },{
        header: 'Kepemilikan Kartu Identitas',
        field: 'kepemilikan_kartu_identitas',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 0,
                label: 'Tidak memiliki'
            },{
                id: 1,
                label: 'Akta kelahiran'
            },{
                id: 2,
                label: 'Kartu pelajar'
            },{
                id: 3,
                label: 'KTP'
            },{
                id: 4,
                label: 'SIM'
        }],
        width: 200,
        type: 'text'
    },{
        header: 'Status Kehamilan',
        field: 'status_hamil',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }],
        width: 100,
        type: 'text'
    },{
        header: 'Jenis Cacat',
        field: 'jenis_cacat',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 0,
                label: 'Tidak cacat'
            },{
                id: 1,
                label: 'Tuna daksa/Cacat tubuh'
            },{
                id: 2,
                label: 'Tuna netra/buta'
            },{
                id: 3,
                label: 'Tuna rungu'
            },{
                id: 4,
                label: 'Tuna wicara'
            },{
                id: 5,
                label: 'Tuna rungu & wicara'
            },{
                id: 6,
                label: 'Tuna netra & cacat tubuh'
            },{
                id: 7,
                label: 'Tuna netra, rungu, & wicara'
            },{
                id: 8,
                label: 'Tuna rungu, wicara, & cacat tubuh'
            },{
                id: 9,
                label: 'Tuna rungu, wicara, netra, & cacat tubuh'
            },{
                id: 10,
                label: 'Cacat mental retardasi'
            },{
                id: 11,
                label: 'Mantan penderita gangguan jiwa'
            },{
                id: 12,
                label: 'Cacat fisik & mental'
        }],
        width: 100,
        type: 'text'
    },{
        header: 'Penyakit Kronis',
        field: 'penyakit_kronis',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 0,
                label: 'Tidak ada'
            },{
                id: 1,
                label: 'Hipertensi'
            },{
                id: 2,
                label: 'Rematik'
            },{
                id: 3,
                label: 'Asma'
            },{
                id: 4,
                label: 'Masalah jantung'
            },{
                id: 5,
                label: 'Diabetes'
            },{
                id: 6,
                label: 'Tuberculosis'
            },{
                id: 7,
                label: 'Stroke'
            },{
                id: 8,
                label: 'Kanker atau tumor ganas'
            },{
                id: 9,
                label: 'Lainnya (gagal ginjal, paru-paru flek, dan sejenisnya)'
        }],
        width: 100,
        type: 'text'
    },{
        header: 'Partisipasi Sekolah',
        field: 'partisipasi_sekolah',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 0,
                label: 'Tidak/belum pernah sekolah '
            },{
                id: 1,
                label: 'Masih sekolah'
            },{
                id: 2,
                label: 'Tidak bersekolah lagi'
        }],
        width: 100,
        type: 'text'
    },  {
        header: 'Jenjang Pendidikan Tertinggi',
        field: 'jenjang_pendidikan_tertinggi',
        renderer: renderers.keyValuePairRenderer,
        originData:[{
                id: 1,
                label: 'SD/SDLB'
            },{
                id: 2,
                label: 'Paket A'
            },{
                id: 3,
                label: 'M. Ibtidaiyah'
            },{
                id: 4,
                label: 'SMP/SMPLB'
            },{
                id: 5,
                label: 'Paket B'
            },{
                id: 6,
                label: 'M. Tsanawiyah'
            },{
                id: 7,
                label: 'SMA/SMK/SMALB'
            },{
                id: 8,
                label: 'M. Aliyah'
            },{
                id: 9,
                label: 'Paket C'
            },{
                id: 10,
                label: 'Perguruan Tinggi'
        }],
        width: 150,
        type: 'text'
    },{
        header: 'Kelas Tertinggi',
        field: 'kelas_tertinggi',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 1,
                label: '1'
            },{
                id: 2,
                label: '2'
            },{
                id: 3,
                label: '3'
            },{
                id: 4,
                label: '4'
            },{
                id: 5,
                label: '5'
            },{
                id: 6,
                label: '6'
            },{
                id: 7,
                label: '7'
            },{
                id: 8,
                label: '8'
        }],
        width: 100,
        type: 'text'
    },{
        header: 'Ijazah Tertinggi',
        field: 'ijazah_tertinggi',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 0,
                label: 'Tidak punya ijazah'
            },{
                id: 1,
                label: 'SD/Sederajat'
            },{
                id: 2,
                label: 'SMP/Sederajat'
            },{
                id: 3,
                label: 'SMA/Sederajat'
            },{
                id: 4,
                label: 'D1/D2/D3'
            },{
                id: 5,
                label: 'D4/S1'
            },{
                id: 6,
                label: 'S2/S3'
        }],
        width: 100,
        type: 'text'
    },{
        header: 'Bekerja/Membantu Bekerja',
        field: 'bekerja_membantu_bekerja',
        renderer: renderers.keyValuePairRenderer,
        originData:[{
                id: 1,
                label: 'Ya'
            },{
                id: 2,
                label: 'Tidak'
        }],
        width: 150,
        type: 'text'
    }, {
        header: 'Jumlah Jam Kerja',
        field: 'jumlah_jam_kerja',
        width: 100,
        type: 'text'
    },  {
        header: 'Lapangan Usaha',
        field: 'lapangan_usaha',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 1,
                label: 'Pertanian tanaman padi & palawija'
            },{
                id: 2,
                label: 'Hortikultura'
            },{
                id: 3,
                label: 'Perkebunan'
            },{
                id: 4,
                label: 'Perikanan tangkap'
            },{
                id: 5,
                label: 'Perikanan budidaya'
            },{
                id: 6,
                label: 'Peternakan'
            },{
                id: 7,
                label: 'Kehutanan & pertanian lainnya'
            },{
                id: 8,
                label: 'Pertambangan/penggalian'
            },{
                id: 9,
                label: 'Industri pengolahan'
            },{
                id: 10,
                label: 'Listrik dan gas'
            },{
                id: 11,
                label: 'Bangunan/Konstruksi'
            },{
                id: 12,
                label: 'Perdagangan'
            },{
                id: 13,
                label: 'Hotel & Rumah makan'
            },{
                id: 14,
                label: 'Transportasi & Pergudangan'
            },{
                id: 15,
                label: 'Informasi & Komunaksi'
            },{
                id: 16,
                label: 'Keuangan & asuransi'
            },{
                id: 17,
                label: 'Jasa pendidikan'
            },{
                id: 18,
                label: 'Jasa kesehatan'
            },{
                id: 19,
                label: 'Jasa kemasyarakatan, pemerintahan & perorangan'
            },{
                id: 20,
                label: 'Pemulung'
            },{
                id: 21,
                label: 'Lainnya'
        }],
        width: 100,
        type: 'text'
    },{
        header: 'Status Kedudukan',
        field: 'status_kedudukan',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 1,
                label: 'Berusaha sendiri'
            },{
                id: 2,
                label: 'Berusaha dibantu buruh tidak tetap/tidak dibayar'
            },{
                id: 3,
                label: 'Berusaha dibantu buruh tetap/dibayar'
            },{
                id: 4,
                label: 'Buruh/karyawan/pegawai swasta'
            },{
                id: 5,
                label: 'PNS/TNI/Polri/BUMN/BUMD/anggota legislatif'
            },{
                id: 6,
                label: 'Pekerja bebas pertanian'
            },{
                id: 7,
                label: 'Pekerja bebas non-pertanian'
            },{
                id: 8,
                label: 'Pekerja keluarga/tidak dibayar'
        }],
        width: 100,
        type: 'text'
    }, {
        header: 'Status Kesejahteraan',
        field: 'status_kesejahteraan',
        renderer: renderers.keyValuePairRenderer,
        originData: [{
                id: 1,
                label: 'Gembel'
            },{
                id: 2,
                label: 'Cukup Sejahtera'
            },{
                id: 3,
                label: 'Sejahtera'
            },{
                id: 4,
                label: 'Sangat Sejahtera'
            },{
                id: 5,
                label: 'Tidak mampu/mahal'
            },{
                id: 6,
                label: 'Ingin punya anak'
            },{
                id: 6,
                label: 'Lainnya'
        }],
        width: 100,
        type: 'text'
    },{
        header: 'Nomor Urut Rumah Tangga',
        field: 'nomor_urut_rumah_tangga',
        width: 100,
        type: 'text'
    }
]
