import * as renderers from './renderers';

export default [
    {
        header: 'id',
        type: 'text',
        field: 'id',
        readOnly: true,
        hiddenColumn: true
    },
    {
        header: 'No KK',
        type: 'text',
        field: 'no_kk',
        readOnly: true

    },    
    {
        header: 'Nama Kepala Keluarga',
        type: 'text',
        field:'nama_kepala_keluarga',
        readOnly: true
    },
    {
        header: 'Nama Responden',
        type: 'text',
        field: 'nama_responden'
    },
    {
        header: 'No Responden',
        type: 'text',
        field: 'no_responden'
    },  
    {
        header: 'Nama Pendata',
        type: 'text',
        field: 'nama_pendata'
    },    
    {
        header: 'Nama Pemeriksa',
        type: 'text',
        field: 'nama_pemeriksa'
    },
    {
        header: 'Tanggal Pemeriksaan',
        type: 'date',
        field: 'tanggal_pemeriksaan',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 120,
    },
    {
        header: 'Memiliki KK',   
        type: 'dropdown',    
        field: 'memiliki_kk',
        source: ['ya', 'tidak']
    },
    {
        header: 'Pekerjaan Kep.Kel',
        type: 'dropdown',
        field:'pekerjaan_kepala_keluarga',
        source: ['Ahli Pengobatan Alternatif',
        'Akuntan',
        'Anggota kabinet kementrian',
        'Anggota Legislatif',
        'Anggota mahkamah konstitusi',
        'Apoteker',
        'Arsitektur/Desainer',
        'Belum Bekerja',
        'Bidan swasta',
        'Bupati/walikota',
        'Buruh Harian Lepas',
        'Buruh jasa perdagangan hasil bumi',
        'Buruh Migran',
        'Buruh Tani',
        'Buruh usaha hotel dan penginapan lainnya',
        'Buruh usaha jasa hiburan dan pariwisata',
        'Buruh usaha jasa informasi dan komunikasi',
        'Buruh usaha jasa transportasi dan perhubungan',
        'Dokter swasta',
        'Dosen swasta',
        'Dukun Tradisional',
        'Dukun/paranormal/supranatural',
        'Duta besar',
        'Gubernur',
        'Guru swasta',
        'Ibu Rumah Tangga',
        'Jasa Konsultansi Managemen dan Teknis',
        'Jasa pengobatan alternatif',
        'Jasa penyewaan peralatan pesta',
        'Juru Masak',
        'Karyawan Honorer',
        'Karyawan Perusahaan Pemerintah',
        'Karyawan Perusahaan Swasta',
        'Kepala Daerah',
        'Konsultan Managemen dan Teknis',
        'Kontraktor',
        'Montir',
        'Nelayan',
        'Notaris',
        'Pedagang barang kelontong',
        'Pedagang Keliling',
        'Pegawai Negeri Sipil',
        'Pelajar',
        'Pelaut',
        'Pembantu rumah tangga',
        'Pemilik perusahaan',
        'Pemilik usaha hotel dan penginapan lainnya',
        'Pemilih usaha informasi dan komunikasi',
        'Pemilik usaha jasa hiburan dan pariwisata',
        'Pemilik usaha jasa transportasi dan perhubungan',
        'Pemilik usaha warung, rumah makan dan restoran',
        'Pemuka Agama',
        'Pemulung',
        'Penambang',
        'Peneliti',
        'Pengacara',
        'Pengrajin',
        'Penrajin industri rumah tangga lainnya',
        'Pengusaha kecil, menengah dan besar',
        'Penyiar radio',
        'Perangkat Desa',
        'Perawat swasta',
        'Petani',
        'Peternak',
        'Pialang',
        'Pilot',
        'POLRI',
        'Presiden',
        'Psikiater/Psikolog',
        'Purnawirawan/Pensiunan',
        'Satpam/Security',
        'Seniman/artis',
        'Sopir',
        'Tidak Mempunyai Pekerjaan',
        'TNI',
        'Tukang Anyaman',
        'Tukang Batu',
        'Tukang Cuci',
        'Tukang Cukur',
        'Tukang Gigi',
        'Tukang Jahir',
        'Tukang Kayu',
        'Tukang Kue',
        'Tukang Las',
        'Tukang Listrik',
        'Tukang Rias',
        'Tukang Sumur',
        'Usaha jasa pengerah tenaga kerja',
        'Wakil bupati',
        'Wakil Gubernur',
        'Wakil presiden',
        'Wartawan',
        'Wiraswasta'],
    },
    {
        header: 'Kepemilikan Rumah',
        type: 'dropdown',
        field: 'kepemilikan_rumah',
        source: ['Milik Sendiri', 'Sewa / Kontrak', 'Pinjam / Numpang Gratis', 'Milik Pemerintah']
       
    },
    {
        header: 'Bagian Terluas Atap',
        type: 'dropdown',
        field: 'bagian_terluas_atap',
        source: ['Genteng Metal', 'Sirap(kayu)', 'Genteng (tanah liat)', 'Asbes', 'Seng', 'Daun Rumbia','Alang-alang']
    },
    {
        header: 'Bagian Terluas dinding',
        type: 'dropdown',
        field: 'bagian_terluas_dinding',
        source: ['Tembok', 'Papan (Kualitas Bagus)','Papan (Kualitas Jelek)', 'Tripleks', 'Seng', 'Gamacca / Gedek', 'Bambu']
    },
    {
        header: 'Bagian Terluas Lantai',
        type: 'dropdown',
        field: 'bagian_terluas_lantai',
        source: ['Tegal / Keramik', 'Papan (Kualitas Bagus)','Papan (Kualitas Jelek)', 'Semen', 'Bambu', 'Tanah']
    },
    {
        header: 'Memiliki Jamban',
        type: 'dropdown',
        field: 'kepemilikan_jamban',
        source: ['Jamban / Wc Sendiri', 'Jamban / Wc Umum', 'Bukan Jamban / WC']
    },
    {
        header: 'Jenis jamban',
        type: 'dropdown',
        field: 'jenis_jamban',
        source: ['Cemplung', 'Plensengan', 'Leher Angsa']
    },
    {
        header: 'Sumber penerangan',
        type: 'dropdown',
        field: 'sumber_penerangan',
        source: ['Listrik PLN Milik Sendiri', 'Listrik PLN Sabung (bayar)', 'Listrik Sambung (Gratis)', 'Listik Non PLN', 'Lampu Petromax', 'Pelita / Lilin', 'Tidak Ada Penerangan']
    },
    {
        header: 'Sumber air minum',
        type: 'dropdown',
        field: 'sumber_air_minum',
        source: ['Air ledeng /PDAM /Kemasan', 'Sumur Bor/ Sumur Pompa/ Sumur Tertutup', 'Mata Air', 'Sumur Terbuka / Tidak Terlindungi', 'Kolam /Empang /Sungai /Parit /Danau', 'Air Hujan']

    },
    {
        header: 'Jarak Sumber Air Minum',
        type: 'text',
        field: 'jarak_sumber_air',
    },
    {
        header: 'Kualitas Air Minum',
        type: 'dropdown',
        field: 'kualitas_air',
        source: ['Berbau', 'Tidak Berbau', 'Berasa', 'Tidak Berasa', 'Berwarna', 'Tidak Berwarna']
    },
    {
        header: 'Air minum dimasak?',
        type: 'dropdown',
        field: 'air_minum_dimasak',        
        source: ['ya', 'tidak']
    },
    {
        header: 'Berapa Anak yang lahir',
        type: 'text',
        field: 'anak_yang_lahir'
    },
    {
        header: 'Berapa anak yang hidup',
        type: 'text',
        field: 'anak_yang_hidup'
    },
    {
        header: 'Berapa anak yang tinggal',
        type: 'text',
        field: 'anak_yang_tinggal'
    },
    {
        header: 'Adakah ibu hamil dalam 1 tahun?',
        type: 'dropdown',
        field: 'ada_ibu_hamil',        
        source: ['ya', 'tidak'],
        width: 200
    },
    {
        header: 'Pernah memeiksa kehamilan?',
        type: 'dropdown',
        field: 'pemeriksaan_kehamilan',   
        source: ['ya', 'tidak'],
        width: 200
    },
    {
        header: 'Ada Kelahiran di Tahun ini',
        type: 'dropdown',
        field:'peristiwa_kelahiran',
        source: ['ya', 'tidak'],
        width: 200
    },
    {
        header: 'Siapa Pemberi pertolongan',
        type: 'dropdown',
        field: 'pemberi_pertolongan',
        source: ['Keluarga / Lainnya', 'Dukun', 'Perawat', 'Bidan', 'Dokter'],
        width: 200

    },
    {
        header: 'Diberikan Asi Untuk Bayi ?',
        type: 'dropdown',
        field: 'pemberian_asi_bayi',        
        source: ['ya', 'tidak'],
        width: 200
    },
    {
        header: 'adakah Kematian Karena Ibu Hamil?',
        type: 'dropdown',
        field: 'kematian_ibu_hamil',        
        source: ['ya', 'tidak'],
        width: 200
    },   
    {
        header: 'Adakah Kematian Karena Anak Lahir',
        type: 'dropdown',
        field: 'anak_lahir_mati',        
        source: ['ya', 'tidak'],
        width: 200
    },   
    {
        header: 'Mengkonsumsi Garam Beryodium?',
        type: 'dropdown',
        field: 'mengkonsumsi_garam_beryodium',
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Jarak Ke PAUD',
        type: 'numeric',
        field: 'jarak_paud'
    }, 
    {
        header: 'Alat Transportasi Ke PAUD',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'transportasi_ke_paud',
        width: 200
    }, 
    {
        header: 'Waktu Tempuh ke PAUD',
        type: 'text',
        field: 'waktu_tempuh_ke_paud',
        width: 200
    }, 
    {
        header: 'Jarak Ke SD / MI',
        type: 'numeric',
        field: 'jarak_sd',
        width: 200
    }, 
    {
        header: 'Alat Transportasi Ke SD / MI',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'transportasi_ke_sd',
        width: 200
    }, 
    {
        header: 'Waktu Tempuh ke SD / MI',
        type: 'text',
        field: 'waktu_tempuh_ke_sd',
        width: 200
    }, 
    {
        header: 'Jarak Ke SMP / MTS',
        type: 'numeric',
        field: 'jarak_smp'
    }, 
    {
        header: 'Transportasi Ke SMP / MTS',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'transportasi_ke_smp',
        width: 200
    }, 
    {
        header: 'Waktu Tempuh ke SMP / MTS',
        type: 'text',
        field: 'waktu_tempuh_ke_smp',
        width: 200
    }, 
    {
        header: 'Jarak Ke SMK / SMA',
        type: 'numeric',
        field: 'jarak_sma',
        width: 200
    }, 
    {
        header: 'Transportasi Ke SMA / SMK',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'transportasi_ke_sma',
        width: 200
    }, 
    {
        header: 'Waktu Tempuh ke SMA / SMK',
        type: 'text',
        field: 'waktu_tempuh_ke_sma',
        width: 200        
    },
    {
        header: 'Jarak Poskedes/Polindes',
        type: 'text',
        field: 'jarak_poskesdes',
        width: 200
    }, 
    {
        header: 'Transportasi Poskesdes/Polindes',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'alat_transportasi_poskesdes',
        width: 200
    }, 
    {
        header: 'Waktu Tempuh Poskesdes/Polindes',
        type: 'text',
        field: 'waktu_tempuh_poskesdes',
        width: 200
    }, 
    {
        header: 'Jarak Pustu (Meter)',
        type: 'text',
        field: 'jarak_pustu',
        width: 200
    }, 
    {
        header: 'Alat Transportasi Pustu',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'alat_transportasi_pustu',
        width: 200
    }, 
    {
        header: 'Waktu Tempuh Pustu (Menit)',
        type: 'text',
        field: 'waktu_tempuh_pustu',
        width: 200
    }, 
    {
        header: 'Jarak Puskesmas (Meter)',
        type: 'text',
        field: 'jarak_puskesmas',
        width: 200
    }, 
    {
        header: 'Transportasi Puskesmas',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'alat_transportasi_puskesmas',
        width: 200
    }, 
    {
        header: 'Waktu Tempuh Puskesmas',
        type: 'text',
        field: 'waktu_tempuh_puskesmas'
    }, 
    {
        header: 'Jarak Rumah Sakit / Klinik',
        type: 'text',
        field: 'jarak_rumahsakit',
        width: 200
    }, 
    {
        header: 'Transportasi Rumah Sakit / Klinik',
        type: 'text',
        field: 'alat_transportasi_rumahsakit'
    }, 
    {
        header: 'Waktu Tempuh Rumah Sakit / Klinik',
        type: 'text',
        field: 'waktu_tempuh_rumahsakit' ,
        width: 200
    }, 
    {
        header: 'Kesehatan Jamkesmas',
        type: 'dropdown',
        field: 'kesehatan_jamkesmas',        
        source: ['ya', 'tidak']
    },
    {
        header: 'Kesehatan Jampersa',
        type: 'dropdown',
        field: 'kesehatan_jampersa',        
        source: ['ya', 'tidak']
    },
    {
        header: 'Kesehatan Jamkesda',
        type: 'dropdown',
        field: 'kesehatan_jamkesda',        
        source: ['ya', 'tidak']
    },
    {
        header: 'Kesehatan Lainnya, sebutkan',
        type: 'text',
        field: 'kesehatan_lainnya'
    },
    {
        header: 'Kesehatan Tidak Ada',
        type: 'dropdown',
        field: 'kesehatan_tidak_ada',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Pendidikan Bantuan Siswa Miskin (BSM)',
        type: 'dropdown',
        field: 'pendidikan_bsm',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Pendidikan Beasiswa Prestasi',
        type: 'dropdown',
        field: 'pendidikan_beasiswa_prestasi',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Pendidikan Beasiswa dari Pemda',
        type: 'dropdown',
        field: 'pendidikan_beasiswa_pemda',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Pendidikan Bantuan dari Dana BOS',
        type: 'dropdown',
        field: 'pendidikan_bantuan_bos',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Pendidikan Lainnya, Sebutkan',
        type: 'text',
        field: 'pendidikan_lainnya' ,
        width: 200      
    }, 
    {
        header: 'Pendidikan Tidak Ada',
        type: 'dropdown',
        field: 'pendidikan_tidak_ada',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Sosial Ekonomi Beras Miskin',
        type: 'dropdown',
        field: 'sosial_ekonomi_raskin',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Sosial Ekonomi SPP PNPM',
        type: 'dropdown',
        field: 'sosial_ekonomi_spp_pnpm',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Sosial Ekonomi PNPM GSC',
        type: 'dropdown',
        field: 'sosial_ekonomi_pnpm_gsc',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Sosial Ekonomi PKH',
        type: 'dropdown',
        field: 'sosial_ekonomi_pkh',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Sosial Ekonomi KUR',
        type: 'dropdown',
        field: 'sosial_ekonomi_kur',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Sosial Ekonomi BLSM',
        type: 'dropdown',
        field: 'sosial_ekonomi_blsm',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Sosial Ekonomi Lainnya, Sebutkan',
        type: 'text',
        field: 'sosial_ekonomi_lainnya'  ,
        width: 200      
    }, 
    {
        header: 'Sosial Ekonomi Tidak Ada',
        type: 'dropdown',
        field: 'sosial_ekonomi_tidak_ada',        
        source: ['ya', 'tidak'],
        width: 200
    }, 
    {
        header: 'Pengeluaran Makanan Rata2 Per Bulan',
        field: 'pengeluaran_makanan_perbulan' ,
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    },     
    {
        header: 'Pengeluaran Pendidikan Rata2 Per Bulan',
        field: 'pengeluaran_pendidikan_perbulan' ,
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    }, 
    
    {
        header: 'Pengeluaran Kesehatan Rata2 Per Bulan',
        field: 'pengeluaran_kesehatan_perbulan',
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    }, 
    
    {
        header: 'Pengeluaran LainnyaRata-Rata Keluarga Per Bulan (Rp.)',
        field: 'pengeluaran_lainnya_perbulan',
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    }, 
    {
        header: 'Pengeluaran Total Rata-Rata Keluarga Per Bulan (Rp.)',
        field: 'pengeluaran_total_perbulan', 
        type: 'numeric',
        width: 220,
        format: '0,0',
        renderer :renderers.rupiahRenderer,
    }, 

    
]
