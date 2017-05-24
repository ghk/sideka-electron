let Models = {};
Models["Ref_Bank_Desa"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "Kd_Rincian", 
  "NoRek_Bank", 
  "Nama_Bank"
 ]

Models["Ref_Bel_Operasional"] = [ 
  "ID_Keg"
 ]
Models["Ref_Bidang"] = [ 
  "Kd_Bid", 
  "Nama_Bidang"
 ]
Models["Ref_Bunga"] = [ 
  "Kd_Bunga", 
  "Kd_Admin"
 ]
Models["Ref_Desa"] = [ 
  "Kd_Kec", 
  "Kd_Desa", 
  "Nama_Desa"
 ]
Models["Ref_Kecamatan"] = [ 
  "Kd_Kec", 
  "Nama_Kecamatan"
 ]
Models["Ref_Kegiatan"] = [ 
  "Kd_Bid", 
  "ID_Keg", 
  "Nama_Kegiatan"
 ]

Models["Ref_Korolari"] = [ 
  "Kd_Rincian", 
  "Kd_RekDB", 
  "Kd_RekKD", 
  "Jenis" 
 ]
Models["Ref_NeracaClose"] = [ 
  "Kd_Rincian", 
  "Kelompok"
 ]
Models["Ref_Perangkat"] = [ 
  "Kode", 
  "Nama_Perangkat"
 ]
Models["Ref_Potongan"] = [ 
  "Kd_Rincian", 
  "Kd_Potongan"
 ]
Models["Ref_Rek1"] = [ 
  "Akun", 
  "Nama_Akun", 
  "NoLap"
 ]
Models["Ref_Rek2"] = [ 
  "Akun", 
  "Kelompok", 
  "Nama_Kelompok"
 ]
Models["Ref_Rek3"] = [ 
  "Kelompok", 
  "Jenis", 
  "Nama_Jenis", 
  "Formula"  
 ]
Models["Ref_Rek4"] = [ 
  "Jenis", 
  "Obyek", 
  "Nama_Obyek", 
  "Peraturan"
 ]
Models["Ref_SBU"] = [ 
  "Kd_Rincian", 
  "Kode_SBU", 
  "NoUrut_SBU", 
  "Nama_SBU", 
  "Nilai", 
  "Satuan"
 ]
Models["Ref_Setting"] = [ 
  "ID", 
  "Kd_Prov", 
  "Kd_Kab", 
  "AutoSPD", 
  "AutoSPP", 
  "AutoSPM", 
  "AutoSP2D", 
  "AutoTBP", 
  "AutoSTS", 
  "AutoSPJ", 
  "AutoBukti", 
  "AutoSSP", 
  "FiturSBU", 
  "AppVer"
 ]
Models["Ref_Sumber"] = [ 
  "Kode", 
  "Nama_Sumber", 
  "Urut"  
 ]
Models["Ta_Anggaran"] = [ 
  "KdPosting", 
  "Tahun", 
  "KURincianSD", 
  "Kd_Rincian", 
  "RincianSD", 
  "Anggaran", 
  "AnggaranPAK", 
  "AnggaranStlhPAK", 
  "Belanja", 
  "Kd_Keg", 
  "SumberDana", 
  "Kd_Desa", 
  "TglPosting" 
 ] 
Models["Ta_AnggaranLog"] = [ 
  "KdPosting", 
  "Tahun", 
  "Kd_Desa", 
  "No_Perdes", 
  "TglPosting" ,
  "UserID", 
  "Kunci"  
 ]  
Models["Ta_AnggaranRinci"] = [ 
  "KdPosting", 
  "Tahun", 
  "Kd_Desa", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "Kd_SubRinci", 
  "No_Urut", 
  "Uraian", 
  "SumberDana", 
  "JmlSatuan", 
  "HrgSatuan", 
  "Satuan", 
  "Anggaran", 
  "JmlSatuanPAK", 
  "HrgSatuanPAK", 
  "AnggaranStlhPAK", 
  "AnggaranPAK"  
 ]
Models["Ta_Bidang"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "Kd_Bid", 
  "Nama_Bidang"
 ]
Models["Ta_Desa"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "Nm_Kades", 
  "Jbt_Kades", 
  "Nm_Sekdes", 
  "NIP_Sekdes", 
  "Jbt_Sekdes", 
  "Nm_Kaur_Keu", 
  "Jbt_Kaur_Keu", 
  "Nm_Bendahara", 
  "Jbt_Bendahara", 
  "No_Perdes", 
  "Tgl_Perdes" ,
  "No_Perdes_PB", 
  "Tgl_Perdes_PB" ,
  "No_Perdes_PJ", 
  "Tgl_Perdes_PJ" ,
  "Alamat", 
  "Ibukota", 
  "Status", 
  "NPWP"
 ]
Models["Ta_JurnalUmum"] = [ 
  "Tahun", 
  "KdBuku", 
  "Kd_Desa", 
  "Tanggal" ,
  "JnsBukti", 
  "NoBukti", 
  "Keterangan", 
  "DK", 
  "Debet", 
  "Kredit", 
  "Jenis", 
  "Posted"  
 ] 
Models["Ta_Kegiatan"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "Kd_Bid", 
  "Kd_Keg", 
  "ID_Keg", 
  "Nama_Kegiatan", 
  "Pagu", 
  "Pagu_PAK", 
  "Nm_PPTKD", 
  "NIP_PPTKD", 
  "Lokasi", 
  "Waktu", 
  "Keluaran", 
  "Sumberdana"
 ]
Models["Ta_Mutasi"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "No_Bukti", 
  "Tgl_Bukti" ,
  "Keterangan", 
  "Kd_Bank", 
  "Kd_Rincian", 
  "Kd_Keg", 
  "Sumberdana", 
  "Kd_Mutasi", 
  "Nilai"  
 ]

Models["Ta_Pajak"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "No_SSP", 
  "Tgl_SSP" ,
  "Keterangan", 
  "Nama_WP", 
  "Alamat_WP", 
  "NPWP", 
  "Kd_MAP", 
  "Nm_Penyetor", 
  "Jn_Transaksi", 
  "Kd_Rincian", 
  "Jumlah", 
  "KdBayar"  
 ]
Models["Ta_PajakRinci"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "No_SSP", 
  "No_Bukti", 
  "Kd_Rincian", 
  "Nilai"  
 ]
Models["Ta_Pemda"] = [ 
  "Tahun", 
  "Kd_Prov", 
  "Kd_Kab", 
  "Nama_Pemda", 
  "Nama_Provinsi", 
  "Ibukota", 
  "Alamat", 
  "Nm_Bupati", 
  "Jbt_Bupati", 
  "Logo" ,
  "C_Kode", 
  "C_Pemda", 
  "C_Data"
 ]
Models["Ta_Pencairan"] = [ 
  "Tahun", 
  "No_Cek", 
  "No_SPP", 
  "Tgl_Cek" ,
  "Kd_Desa", 
  "Keterangan", 
  "Jumlah", 
  "Potongan", 
  "KdBayar"  
 ]
Models["Ta_Perangkat"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "Kd_Jabatan", 
  "No_ID", 
  "Nama_Perangkat", 
  "Alamat_Perangkat", 
  "Nomor_HP", 
  "Rek_Bank", 
  "Nama_Bank"
 ]
Models["Ta_RAB"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "Anggaran", 
  "AnggaranPAK", 
  "AnggaranStlhPAK"  
 ]

Models["Ta_RABRinci"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "Kd_SubRinci", 
  "No_Urut", 
  "SumberDana", 
  "Uraian", 
  "Satuan", 
  "JmlSatuan", 
  "HrgSatuan", 
  "Anggaran", 
  "JmlSatuanPAK", 
  "HrgSatuanPAK", 
  "AnggaranStlhPAK", 
  "AnggaranPAK", 
  "Kode_SBU"
 ]

Models["Ta_RABSub"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "Kd_SubRinci", 
  "Nama_SubRinci", 
  "Anggaran", 
  "AnggaranPAK", 
  "AnggaranStlhPAK"  
 ]

Models["Ta_RPJM_Bidang"] = [ 
  "Kd_Desa", 
  "Kd_Bid", 
  "Nama_Bidang"
 ]
Models["Ta_RPJM_Kegiatan"] = [ 
  "Kd_Desa", 
  "Kd_Bid", 
  "Kd_Keg", 
  "ID_Keg", 
  "Nama_Kegiatan", 
  "Lokasi", 
  "Keluaran", 
  "Kd_Sas", 
  "Sasaran", 
  "Tahun1", 
  "Tahun2", 
  "Tahun3", 
  "Tahun4", 
  "Tahun5", 
  "Tahun6", 
  "Swakelola", 
  "Kerjasama", 
  "Pihak_Ketiga", 
  "Sumberdana"
 ]
Models["Ta_RPJM_Misi"] = [ 
  "ID_Misi", 
  "Kd_Desa", 
  "ID_Visi", 
  "No_Misi", 
  "Uraian_Misi"
 ]

Models["Ta_RPJM_Pagu_Indikatif"] = [ 
  "Kd_Desa", 
  "Kd_Keg", 
  "Kd_Sumber", 
  "Tahun1", 
  "Tahun2", 
  "Tahun3", 
  "Tahun4", 
  "Tahun5", 
  "Tahun6", 
  "Pola"
 ]
Models["Ta_RPJM_Pagu_Tahunan"] = [ 
  "Kd_Desa", 
  "Kd_Keg", 
  "Kd_Tahun", 
  "Kd_Sumber", 
  "Biaya", 
  "Volume", 
  "Satuan", 
  "Lokasi_Spesifik", 
  "Jml_Sas_Pria", 
  "Jml_Sas_Wanita", 
  "Jml_Sas_ARTM", 
  "Waktu", 
  "Mulai" ,
  "Selesai" ,
  "Pola_Kegiatan", 
  "Pelaksana"
 ]
Models["Ta_RPJM_Sasaran"] = [ 
  "ID_Sasaran", 
  "Kd_Desa", 
  "ID_Tujuan", 
  "No_Sasaran", 
  "Uraian_Sasaran"
 ]
Models["Ta_RPJM_Tujuan"] = [ 
  "ID_Tujuan", 
  "Kd_Desa", 
  "ID_Misi", 
  "No_Tujuan", 
  "Uraian_Tujuan"
 ]
Models["Ta_RPJM_Visi"] = [ 
  "ID_Visi", 
  "Kd_Desa", 
  "No_Visi", 
  "Uraian_Visi", 
  "TahunA", 
  "TahunN"
 ]
Models["Ta_SaldoAwal"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "Kd_Rincian", 
  "Jenis", 
  "Anggaran", 
  "Debet", 
  "Kredit", 
  "Tgl_Bukti" 
 ]
Models["Ta_SPJ"] = [ 
  "Tahun", 
  "No_SPJ", 
  "Tgl_SPJ" ,
  "Kd_Desa", 
  "No_SPP", 
  "Keterangan", 
  "Jumlah", 
  "Potongan", 
  "Status"
 ]
Models["Ta_SPJBukti"] = [ 
  "Tahun", 
  "No_SPJ", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "No_Bukti", 
  "Tgl_Bukti" ,
  "Sumberdana", 
  "Kd_Desa", 
  "Nm_Penerima", 
  "Alamat", 
  "Rek_Bank", 
  "Nm_Bank", 
  "NPWP", 
  "Keterangan", 
  "Nilai"  
 ]
Models["Ta_SPJPot"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "No_SPJ", 
  "Kd_Keg", 
  "No_Bukti", 
  "Kd_Rincian", 
  "Nilai"  
 ] 
Models["Ta_SPJRinci"] = [ 
  "Tahun", 
  "No_SPJ", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "Sumberdana", 
  "Kd_Desa", 
  "No_SPP", 
  "JmlCair", 
  "Nilai", 
  "Sisa"  
 ]
Models["Ta_SPJSisa"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "No_Bukti", 
  "Tgl_Bukti" ,
  "No_SPJ", 
  "Tgl_SPJ" ,
  "No_SPP", 
  "Tgl_SPP" ,
  "Kd_Keg", 
  "Keterangan", 
  "Nilai"  
 ]
Models["Ta_SPP"] = [ 
  "Tahun", 
  "No_SPP", 
  "Tgl_SPP" ,
  "Jn_SPP", 
  "Kd_Desa", 
  "Keterangan", 
  "Jumlah", 
  "Potongan", 
  "Status"
 ]
Models["Ta_SPPBukti"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "No_SPP", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "Sumberdana", 
  "No_Bukti", 
  "Tgl_Bukti" ,
  "Nm_Penerima", 
  "Alamat", 
  "Rek_Bank", 
  "Nm_Bank", 
  "NPWP", 
  "Keterangan", 
  "Nilai"  
 ]
Models["Ta_SPPPot"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "No_SPP", 
  "Kd_Keg", 
  "No_Bukti", 
  "Kd_Rincian", 
  "Nilai"  
 ]
Models["Ta_SPPRinci"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "No_SPP", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "Sumberdana", 
  "Nilai"  
 ] 
Models["Ta_STS"] = [ 
  "Tahun", 
  "No_Bukti", 
  "Tgl_Bukti" ,
  "Kd_Desa", 
  "Uraian", 
  "NoRek_Bank", 
  "Nama_Bank", 
  "Jumlah", 
  "Nm_Bendahara", 
  "Jbt_Bendahara"
 ]
Models["Ta_STSRinci"] = [ 
  "Tahun", 
  "Kd_Desa", 
  "No_Bukti", 
  "No_TBP", 
  "Uraian", 
  "Nilai"  
 ] 
Models["Ta_TBP"] = [ 
  "Tahun", 
  "No_Bukti", 
  "Tgl_Bukti" ,
  "Kd_Desa", 
  "Uraian", 
  "Nm_Penyetor", 
  "Alamat_Penyetor", 
  "TTD_Penyetor", 
  "NoRek_Bank", 
  "Nama_Bank", 
  "Jumlah", 
  "Nm_Bendahara", 
  "Jbt_Bendahara", 
  "Status", 
  "KdBayar", 
  "Ref_Bayar"
 ]
Models["Ta_TBPRinci"] = [ 
  "Tahun", 
  "No_Bukti", 
  "Kd_Desa", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "RincianSD", 
  "SumberDana", 
  "Nilai"  
 ]

Models["Ta_Triwulan"] = [ 
  "KURincianSD", 
  "Tahun", 
  "Sifat", 
  "SumberDana", 
  "Kd_Desa", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "Anggaran", 
  "AnggaranPAK", 
  "Tw1Rinci", 
  "Tw2Rinci", 
  "Tw3Rinci", 
  "Tw4Rinci", 
  "KunciData"
 ]
Models["Ta_TriwulanArsip"] = [ 
  "KdPosting", 
  "KURincianSD", 
  "Tahun", 
  "Sifat", 
  "SumberDana", 
  "Kd_Desa", 
  "Kd_Keg", 
  "Kd_Rincian", 
  "Anggaran", 
  "AnggaranPAK", 
  "Tw1Rinci", 
  "Tw2Rinci", 
  "Tw3Rinci", 
  "Tw4Rinci", 
  "KunciData"
 ]
Models["Ta_UserDesa"] = [ 
  "UserID", 
  "Kd_Kec", 
  "Kd_Desa"
 ]
Models["Ta_UserID"] = [ 
  "UserID", 
  "Nama", 
  "Password", 
  "Level", 
  "Keterangan"
 ]
Models["Ta_UserLog"] = [ 
  "TglLogin", 
  "Komputer", 
  "UserID", 
  "Tahun", 
  "AplVer", 
  "DbVer"
 ]
Models["Ta_UserMenu"] = [ 
  "UserID", 
  "IDMenu", 
  "Otoritas"
 ]

 export default Models;