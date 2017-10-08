import * as renderers from './renderers';

export default [
    {
        header: 'id',
        type: 'text',
        field: 'id',
        readOnly: true
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
        type: 'text',
        field:'pekerjaan_kepala_keluarga',
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
        field: 'memiliki_jamban',
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
        source: ['ya', 'tidak']
    },
    {
        header: 'Pernah memeiksa kehamilan?',
        type: 'dropdown',
        field: 'pemeriksaan_kehamilan',   
        source: ['ya', 'tidak']
    },
    {
        header: 'Adakah Peristiwa kelahiran di tahun ini',
        type: 'dropdown',
        field:'peristiwa_kelahiran',
        source: ['ya', 'tidak']
    },
    {
        header: 'Siapa Pemberi pertolongan',
        type: 'dropdown',
        field: 'pemberi_pertolongan',
        source: ['Keluarga / Lainnya', 'Dukun', 'Perawat', 'Bidan', 'Dokter']

    },
    {
        header: 'Diberikan Asi Untuk Bayi ?',
        type: 'dropdown',
        field: 'pemberian_asi_bayi',        
        source: ['ya', 'tidak']
    },
    {
        header: 'Adakah Peristiwa kematian karena ibu hamil?',
        type: 'dropdown',
        field: 'peristiwa_kematian_ibu_hamil',        
        source: ['ya', 'tidak']
    },    
    {
        header: 'Apakah mengkonsumsi Garam Beryodium?',
        type: 'dropdown',
        field: 'mengkonsumsi_garam_beryodium',
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Jarak Ke PAUD',
        type: 'text',
        field: 'jarak_paud'
    }, 
    {
        header: 'Alat Transportasi Ke PAUD',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'transportasi_ke_paud'
    }, 
    {
        header: 'Waktu Tempuh ke PAUD',
        type: 'text',
        field: 'waktu_tempuh_ke_paud'
    }, 
    {
        header: 'Jarak Ke SD / MI',
        type: 'text',
        field: 'jarak_sd'
    }, 
    {
        header: 'Alat Transportasi Ke SD / MI',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'transportasi_ke_sd'
    }, 
    {
        header: 'Waktu Tempuh ke SD / MI',
        type: 'text',
        field: 'waktu_tempuh_ke_sd'
    }, 
    {
        header: 'Jarak Ke SMP / MTS',
        type: 'text',
        field: 'jarak_smp'
    }, 
    {
        header: 'Alat Transportasi Ke SMP / MTS',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'transportasi_ke_smp'
    }, 
    {
        header: 'Waktu Tempuh ke SMP / MTS',
        type: 'text',
        field: 'waktu_tempuh_ke_smp'
    }, 
    {
        header: 'Jarak Ke SMK / SMA',
        type: 'text',
        field: 'jarak_sma'
    }, 
    {
        header: 'Alat Transportasi Ke SMA / SMK',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'transportasi_ke_sma'
    }, 
    {
        header: 'Waktu Tempuh ke SMA / SMK',
        type: 'text',
        field: 'waktu_tempuh_ke_sma'
    },
    {
        header: 'Jarak Poskedes/Polindes (Meter)',
        type: 'text',
        field: 'jarak_poskesdes'
    }, 
    {
        header: 'Alat Transportasi Poskesdes/Polindes',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'alat_transportasi_poskesdes'
    }, 
    {
        header: 'Waktu Tempuh Poskesdes/Polindes (Menit)',
        type: 'text',
        field: 'waktu_tempuh_poskesdes'
    }, 
    {
        header: 'Jarak Pustu (Meter)',
        type: 'text',
        field: 'jarak_pustu'
    }, 
    {
        header: 'Alat Transportasi Pustu',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'alat_transportasi_pustu'
    }, 
    {
        header: 'Waktu Tempuh Pustu (Menit)',
        type: 'text',
        field: 'waktu_tempuh_pustu'
    }, 
    {
        header: 'Jarak Puskesmas (Meter)',
        type: 'text',
        field: 'jarak_puskesmas'
    }, 
    {
        header: 'Alat Transportasi Puskesmas',
        type: 'dropdown',
        source: ['Kendaraan bermotor', 'Kendaraan Tak Bermotor', 'Kendaraan Umum Bermotor', 'Kendaraan Umum Tak Bermotor', 'Kendaraan Orang Lain(Gratis)', 'Jalan Kaki'],
        field: 'alat_transportasi_puskesmas'
    }, 
    {
        header: 'Waktu Tempuh Puskesmas (Menit)',
        type: 'text',
        field: 'waktu_tempuh_puskesmas'
    }, 
    {
        header: 'Jarak Rumah Sakit / Klinik Swasta (Meter)',
        type: 'text',
        field: 'jarak_rumahsakit'
    }, 
    {
        header: 'Alat Transportasi Rumah Sakit / Klinik Swasta',
        type: 'text',
        field: 'alat_transportasi_rumahsakit'
    }, 
    {
        header: 'Waktu Tempuh Rumah Sakit / Klinik Swasta (Menit)',
        type: 'text',
        field: 'waktu_tempuh_rumahsakit'
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
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Pendidikan Beasiswa Prestasi',
        type: 'dropdown',
        field: 'pendidikan_beasiswa_prestasi',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Pendidikan Beasiswa dari Pemda',
        type: 'dropdown',
        field: 'pendidikan_b    easiswa_pemda',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Pendidikan Bantuan dari Dana BOS',
        type: 'dropdown',
        field: 'pendidikan_bantuan_bos',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Pendidikan Lainnya, Sebutkan',
        type: 'text',
        field: 'pendidikan_lainnya'       
        }, 
    {
        header: 'Pendidikan Tidak Ada',
        type: 'dropdown',
        field: 'pendidikan_tidak_ada',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Sosial Ekonomi Beras Miskin',
        type: 'dropdown',
        field: 'sosial_ekonomi_raskin',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Sosial Ekonomi SPP PNPM',
        type: 'dropdown',
        field: 'sosial_ekonomi_spp_pnpm',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Sosial Ekonomi PNPM GSC',
        type: 'dropdown',
        field: 'sosial_ekonomi_pnpm_gsc',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Sosial Ekonomi PKH',
        type: 'dropdown',
        field: 'sosial_ekonomi_pkh',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Sosial Ekonomi KUR',
        type: 'dropdown',
        field: 'sosial_ekonomi_kur',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Sosial Ekonomi BLSM',
        type: 'dropdown',
        field: 'sosial_ekonomi_blsm',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Sosial Ekonomi Lainnya, Sebutkan',
        type: 'text',
        field: 'sosial_ekonomi_lainnya'        
    }, 
    {
        header: 'Sosial Ekonomi Tidak Ada',
        type: 'dropdown',
        field: 'sosial_ekonomi_tidak_ada',        
        source: ['ya', 'tidak']
    }, 
    {
        header: 'Pengeluaran Makanan Rata-Rata Keluarga Per Bulan (Rp.)',
        type: 'text',
        field: 'pengeluaran_makanan_perbulan'        
    }, 
    
    {
        header: 'Pengeluaran Pendidikan Rata-Rata Keluarga Per Bulan (Rp.)',
        type: 'text',
        field: 'pengeluaran_pendidikan_perbulan'        
    }, 
    
    {
        header: 'Pengeluaran Kesehatan Rata-Rata Keluarga Per Bulan (Rp.)',
        type: 'text',
        field: 'pengeluaran_kesehatan_perbulan'        
    }, 
    
    {
        header: 'Pengeluaran LainnyaRata-Rata Keluarga Per Bulan (Rp.)',
        type: 'text',
        field: 'pengeluaran_lainnya_perbulan'        
    }, 
    {
        header: 'Pengeluaran Total Rata-Rata Keluarga Per Bulan (Rp.)',
        type: 'text',
        field: 'pengeluaran_total_perbulan'        
    }, 

    
]
