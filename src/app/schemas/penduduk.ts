import editors from './editors';
import { chosenRenderer } from './renderers';
import { SchemaColumn } from "./schema";

let schema: SchemaColumn[] = [
  {
     header: 'Id',
     field: 'id', 
     width: 0,
     type: 'text'
  },
  {
     header: 'NIK',
     field: 'nik', 
     width: 140,
     type: 'text'
  },
  {
     header: 'Nama Lengkap',
     field: 'nama_penduduk', 
     width: 250,
     type: 'text'
  },
  {
     header: 'Jenis Kelamin',
     field: 'jenis_kelamin',
     type: 'dropdown',
     source: ['Laki-laki', 'Perempuan', 'Tidak Diketahui'],
     width: 110,
     importHeaders: ["Jenis Kelamin"],
  },
  {
        header: 'Tempat Lahir',
        field: 'tempat_lahir', 
        width: 120,
        type: 'text'
    },
    {
        header: 'Tanggal Lahir',
        field: 'tanggal_lahir', 
        type: 'date',
        dateFormat: 'DD/MM/YYYY',
        datePickerConfig: {yearRange: 50},
        correctFormat: true,
        defaultDate: '01/01/1900',
        width: 120,
    },
    {   
        header: 'Status Kawin',
        field: 'status_kawin', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Belum Kawin', 'Kawin', 'Janda/Duda'],
        width: 120,
    },
    {
        header: 'Agama',
        field: 'agama', 
        type: 'dropdown',
        source: ['Budha', 'Hindu', 'Islam', 'Katholik', 'Kepercayaan Kepada Tuhan YME', 'Konghuchu', 'Kristen'],
        width: 90,
    },
    {
        header: 'Gol. Darah',
        field: 'golongan_darah', 
        type: 'dropdown',
        source: ['O', 'A', 'B', 'AB', 'Tidak Tahu'],
        width: 100,
        importHeaders: ["Golongan Darah"],
    },
    {
        header: 'Kewarganegaraan',
        field: 'kewarganegaraan', 
        type: 'dropdown',
        source: ['Warga Negara Indonesia', 'Warga Negara Asing', 'Dwi Kewarganegaraan'],
        width: 170,
        importHeaders: ["Kewarganegaraan"],
    },
    {
      header: 'No KK',
      field: 'no_kk',
      type: 'text'
    },
    {
      header: 'Nama Ayah',
      field: 'nama_ayah',
      type: 'text'
    },
    {
      header: 'Nama Ibu',
      field: 'nama_ibu',
      type: 'text'
    },
    {
      header: 'Hubungan Keluarga',
      field: 'hubungan_keluarga', 
      type: 'dropdown',
      source: [
            'Adik',
            'Anak Angkat',
            'Anak Kandung',
            'Anak Tiri',
            'Ayah',
            'Cucu',
            'Famili lain',
            'Ibu',
            'Istri',
            'Kakak',
            'Kakek',
            'Kepala Keluarga',
            'Keponakan',
            'Lainnya',
            'Menantu',
            'Mertua',
            'Nenek',
            'Paman',
            'Sepupu',
            'Suami',
            'Tante',
            'Teman'],
        importHeaders: ["Status Keluarga"],
    },
    {
        header: 'Nama Dusun',
        field: 'nama_dusun', 
        type: 'text'
    },
    {   
        header: 'RW',
        field: 'rw', 
        type: 'text',
        width: 70,
    },
    {
        header: 'RT',
        field: 'rt', 
        type: 'text',
        width: 70,
    },
    {
        header: 'Alamat Jalan',
        field: 'alamat_jalan', 
        type: 'text'
    },
    {
        header: 'No Telepon',
        field: 'no_telepon', 
        type: 'text',
        width: 100,
        importHeaders: ["No Telp"],
    },
    {
        header: 'Email',
        field: 'email', 
        type: 'text',
        width: 100,
        
    },
    {
        header: 'Akta Kelahiran',
        field: 'no_akta', 
        type: 'text'
    },
    {   
        header: 'No Kitas',
        field: 'no_kitas', 
        type: 'text',
        width: 100,
    },
    {
        header: 'No Paspor',
        field: 'no_paspor', 
        type: 'text',
        width: 100,
    },
    {
        header: 'Pendidikan Terakhir',
        field: 'pendidikan', 
        type: 'dropdown',
        source: ['Belum masuk TK/Kelompok Bermain', 
                 'Sedang TK/Kelompok Bermain', 
                 'Sedang SD/sederajat', 
                 'Sedang SLTP/sederajat', 
                 'Sedang SLTA/sederajat', 
                 'Sedang D-1/sederajat', 
                 'Sedang D-2/sederajat',
                 'Sedang D-3/sederajat',
                 'Sedang S-1/sederajat',
                 'Sedang S-2/sederajat',
                 'Sedang S-3/sederajat',
                 'Tamat SD/sederajat',
                 'Tamat SLTP/sederajat',
                 'Tamat SLTA/sederajat',
                 'Tamat D-1/sederajat',
                 'Tamat D-2/sederajat',
                 'Tamat D-3/sedarajat',
                 'Tamat D-4/sederajat',
                 'Tamat S-1/sederajat',
                 'Tamat S-2/sederajat',
                 'Tamat S-3/sederajat',
                 'Sedang SLB A/sederajat',
                 'Sedang SLB B/sederajat',
                 'Sedang SLB C/sederajat',
                 'Tamat SLB A/sederajat',
                 'Tamat SLB B/sederajat',
                 'Tamat SLB C/sederajat',
                 'Tidak pernah sekolah',
                 'Tidak dapat membaca dan menulis huruf Latin/Arab',
                 'Tidak tamat SD/sederajat'],
        width: 150,
    },
    {
        header: 'Mata Pencaharian Pokok',
        field: 'pekerjaan', 
        type: 'dropdown',
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
                 'Tukang Jahit',
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
        width: 200,
    },
    {
        header: 'Etnis/Suku',
        field: 'etnis_suku', 
        width: 120,
        type: 'text'
    },
    {   
        header: 'Status Tinggal',
        field: 'status_tinggal', 
        type: 'dropdown',
        source: ['Tidak Diketahui', 'Tinggal Tetap', 'Tinggal di luar desa (dalam 1 kab/kota)',
        'Tinggal di luar kota','Tinggal di luar provinsi','Tinggal di luar negeri'],
        width: 150,
    },
    {
        header: 'Akseptor KB',
        field: 'akseptor_kb', 
        type: 'dropdown',
        source: ['KB Alamiah/Kalender', 'Kondom', 'Obat Tradisional', 'Pil', 'Spiral', 'Suntik', 'Susuk KB (Implant)', 
                 'Tidak Menggunakan kontrasepsi', 'Tidak Menjawab', 'Tubektomi', 'Vasektomi'],
        width: 120
    },
    {
        header: 'Cacat Fisik',
        field: 'cacat_fisik', 
        width: 120,
        type: 'text',
        chosenOptions: {
          multiple: true,
          data: [
            {
              id: 'Lumpuh',
              label: 'Lumpuh'
            },
            {
              id: 'Sumbing',
              label: 'Sumbing'
            },
            {
              id: 'Tuna Netra',
              label: 'Tuna Netra'
            },
            {
              id: 'Tuna Rungu',
              label: 'Tuna Rungu'
            },
            {
              id: 'tuna_wicara',
              label: 'Tuna Wicara'
            }
          ]
        },
        renderer: chosenRenderer,
        editor: editors.chosen,
    },
    {
        header: 'Cacat Mental',
        field: 'cacat_mental', 
        type: 'text',
        width: 120,
        chosenOptions: {
          multiple: true,
          data: [
            {
              id: 'Gila',
              label: 'Gila'
            },
            {
              id: 'Idiot',
              label: 'Idiot'
            },
            {
              id: 'Stress',
              label: 'Stress'
            },
            {
              id: 'Tuna Rungu',
              label: 'Tuna Rungu'
            }
          ]
        },
        renderer: chosenRenderer,
        editor: editors.chosen,
    },
    {
        header: 'Wajib Pajak',
        field: 'wajib_pajak', 
        type: 'text',
        chosenOptions: {
          multiple: true,
          data: [
            {
              id: 'Wajib Pajak Badan/Perusahaan',
              label: 'Wajib Pajak Badan/Perusahaan'
            },
            {
              id: 'Wajib Pajak Bumi dan Bangunan',
              label: 'Wajib Pajak Bumi dan Bangunan'
            },
            {
              id: 'Wajib Pajak Kendaraan Bermotor',
              label: 'Wajib Pajak Kendaraan Bermotor'
            },
            {
              id: 'Wajib Pajak Penghasilan Perorangan',
              label: 'Wajib Pajak Penghasilan Perorangan'
            },
            {
              id: 'Wajib Retribusi Keamanan',
              label: 'Wajib Retribusi Keamanan'
            },
            {
              id: 'Wajib Retribusi Keamanan',
              label: 'Wajib Retribusi Keamanan'
            }
          ]
        },
        renderer: chosenRenderer,
        editor: editors.chosen,
        width: 200
    },
    {
        header: 'Lembaga Pemerintahan',
        field: 'lembaga_pemerintahan', 
        type: 'text',
        chosenOptions: {
          multiple: true,
          data: [
            {
              id: 'Anggota BPD',
              label: 'Anggota BPD'
            },
            {
              id: 'Kepala Desa/Lurah',
              label: 'Kepala Desa/Lurah'
            },
            {
              id: 'Kepala Dusun/Lingkungan',
              label: 'Kepala Dusun/Lingkungan'
            },
            {
              id: 'Kepala Urusan',
              label: 'Kepala Urusan'
            },
            {
              id: 'Ketua BPD',
              label: 'Ketua BPD'
            },
            {
              id: 'Sekretaris BPD',
              label: 'Sekretaris BPD'
            },
            {
              id: 'Sekretaris Desa/Kelurahan',
              label: 'Sekretaris Desa/Kelurahan'
            },
            {
              id: 'Staf Desa/Kelurahan',
              label: 'Staf Desa/Kelurahan'
            },
            {
              id: 'Wakil Ketua BPD',
              label: 'Wakil Ketua BPD'
            }
          ]
        },
        renderer: chosenRenderer,
        editor: editors.chosen,
        width: 200
    },
    {
        header: 'Lembaga Kemasyarakatan',
        field: 'lembaga_kemasyarakatan', 
        type: 'text',
        chosenOptions: {
          multiple: true,
          data:[{
                  id: "Anggota Karang Taruna",
                  label: "Anggota Karang Taruna"
                },
                {
                  id: "Anggota Lembaga Gotong royong",
                  label: "Anggota Lembaga Gotong royong"
                },
                {
                  id: "Anggota LKMD/K/LPM",
                  label: "Anggota LKMD/K/LPM"
                },
                {
                  id: "Anggota Organisasi Bapak-bapak",
                  label: "Anggota Organisasi Bapak-bapak"
                },
                {
                  id: "Anggota Organisasi keagamaan",
                  label: "Anggota Organisasi keagamaan"
                },
                {
                  id: "Anggota Organisasi Kelompok Tani/Nelayan",
                  label: "Anggota Organisasi Kelompok Tani/Nelayan"
                },
                {
                  id: "Anggota organisasi pemirsa/pendengar",
                  label: "Anggota organisasi pemirsa/pendengar"
                },
                {
                  id: "Anggota organisasi pencinta alam",
                  label: "Anggota organisasi pencinta alam"
                },
                {
                  id: "Anggota organisasi pengembangan ilmu pengetaahuan",
                  label: "Anggota organisasi pengembangan ilmu pengetaahuan"
                },
                {
                  id: "Anggota organisasi pensiunan",
                  label: "Anggota organisasi pensiunan"
                },
                {
                  id: "Anggota Organisasi Perempuan",
                  label: "Anggota Organisasi Perempuan"
                },
                {
                  id: "Anggota Organisasi Profesi guru",
                  label: "Anggota Organisasi Profesi guru"
                },
                {
                  id: "Anggota Organisasi profesi wartawan",
                  label: "Anggota Organisasi profesi wartawan"
                },
                {
                  id: "Anggota Organisasi profesi/tenaga medis",
                  label: "Anggota Organisasi profesi/tenaga medis"
                },
                {
                  id: "Anggota Pengurus RT",
                  label: "Anggota Pengurus RT"
                },
                {
                  id: "Anggota Pengurus RW",
                  label: "Anggota Pengurus RW"
                },
                {
                  id: "Anggota PKK",
                  label: "Anggota PKK"
                },
                {
                  id: "Anggota Satgas Kebakaran",
                  label: "Anggota Satgas Kebakaran"
                },
                {
                  id: "Anggota Satgas Kebersihan",
                  label: "Anggota Satgas Kebersihan"
                },
                {
                  id: "Anggota Tim Penanggulangan Bencana",
                  label: "Anggota Tim Penanggulangan Bencana"
                },
                {
                  id: "Anggota yayasan",
                  label: "Anggota yayasan"
                },
                {
                  id: "Pemilik yayasan",
                  label: "Pemilik yayasan"
                },
                {
                  id: "Pengurus Hansip/Linmas",
                  label: "Pengurus Hansip/Linmas"
                },
                {
                  id: "Pengurus Karang Taruna",
                  label: "Pengurus Karang Taruna"
                },
                {
                  id: "Pengurus Lembaga Adat",
                  label: "Pengurus Lembaga Adat"
                },
                {
                  id: "Pengurus Lembaga Gotong royong",
                  label: "Pengurus Lembaga Gotong royong"
                },
                {
                  id: "Pengurus lembaga pencinta alam",
                  label: "Pengurus lembaga pencinta alam"
                },
                {
                  id: "Pengurus LKMD/K/LPM",
                  label: "Pengurus LKMD/K/LPM"
                },
                {
                  id: "Pengurus Organisasi Bapak-bapak",
                  label: "Pengurus Organisasi Bapak-bapak"
                },
                {
                  id: "Pengurus Organisasi keagamaan",
                  label: "Pengurus Organisasi keagamaan"
                },
                {
                  id: "Pengurus Organisasi Kelompok Tani/Nelayan",
                  label: "Pengurus Organisasi Kelompok Tani/Nelayan"
                },
                {
                  id: "Pengurus organisasi pemirsa/pendengar",
                  label: "Pengurus organisasi pemirsa/pendengar"
                },
                {
                  id: "Pengurus organisasi pengembangan ilmu pengetahuan",
                  label: "Pengurus organisasi pengembangan ilmu pengetahuan"
                },
                {
                  id: "Pengurus organisasi pensiunan",
                  label: "Pengurus organisasi pensiunan"
                },
                {
                  id: "Pengurus Organisasi Perempuan",
                  label: "Pengurus Organisasi Perempuan"
                },
                {
                  id: "Pengurus Organisasi profesi dokter/tenaga medis",
                  label: "Pengurus Organisasi profesi dokter/tenaga medis"
                },
                {
                  id: "Pengurus Organisasi Profesi guru",
                  label: "Pengurus Organisasi Profesi guru"
                },
                {
                  id: "Pengurus Organisasi profesi wartawan",
                  label: "Pengurus Organisasi profesi wartawan"
                },
                {
                  id: "Pengurus PKK",
                  label: "Pengurus PKK"
                },
                {
                  id: "Pengurus Poskamling",
                  label: "Pengurus Poskamling"
                },
                {
                  id: "Pengurus Posko Penanggulangan Bencana",
                  label: "Pengurus Posko Penanggulangan Bencana"
                },
                {
                  id: "Pengurus Posyandu",
                  label: "Pengurus Posyandu"
                },
                {
                  id: "Pengurus Posyantekdes",
                  label: "Pengurus Posyantekdes"
                },
                {
                  id: "Pengurus RT",
                  label: "Pengurus RT"
                },
                {
                  id: "Pengurus RW",
                  label: "Pengurus RW"
                },
                {
                  id: "Pengurus Satgas Kebakaran",
                  label: "Pengurus Satgas Kebakaran"
                },
                {
                  id: "Pengurus Satgas Kebersihan",
                  label: "Pengurus Satgas Kebersihan"
                },
                {
                  id: "Pengurus yayasan",
                  label: "Pengurus yayasan"
                }
              ]
        },
        renderer: chosenRenderer,
        editor: editors.chosen,
        width: 200
    },
      {
        header: 'Lembaga Ekonomi',
        field: 'lembaga_ekonomi', 
        type: 'text',
        chosenOptions: {
          multiple: true,
          data:[{
                  id: "Angkutan Darat",
                  label: "Angkutan Darat"
                },
                {
                  id: "Angkutan Laut",
                  label: "Angkutan Laut"
                },
                {
                  id: "Angkutan Sungai",
                  label: "Angkutan Sungai"
                },
                {
                  id: "Angkutan Udara",
                  label: "Angkutan Udara"
                },
                {
                  id: "Asrama",
                  label: "Asrama"
                },
                {
                  id: "Bank Perkreditan Rakyat",
                  label: "Bank Perkreditan Rakyat"
                },
                {
                  id: "Bioskop",
                  label: "Bioskop"
                },
                {
                  id: "Film Keliling",
                  label: "Film Keliling"
                },
                {
                  id: "Group Lawak",
                  label: "Group Lawak"
                },
                {
                  id: "Group Musik/Band",
                  label: "Group Musik/Band"
                },
                {
                  id: "Group Vokal/Paduan Suara",
                  label: "Group Vokal/Paduan Suara"
                },
                {
                  id: "Home Stay",
                  label: "Home Stay"
                },
                {
                  id: "Hotel",
                  label: "Hotel"
                },
                {
                  id: "Industri Alat Pertanian",
                  label: "Industri Alat Pertanian"
                },
                {
                  id: "Industri Alat Rumah Tangga",
                  label: "Industri Alat Rumah Tangga"
                },
                {
                  id: "Industri Farmasi",
                  label: "Industri Farmasi"
                },
                {
                  id: "Industri Karoseri",
                  label: "Industri Karoseri"
                },
                {
                  id: "Industri Kerajinan Tangan",
                  label: "Industri Kerajinan Tangan"
                },
                {
                  id: "Industri Pakaian",
                  label: "Industri Pakaian"
                },
                {
                  id: "Industri Perakitan Elektronik",
                  label: "Industri Perakitan Elektronik"
                },
                {
                  id: "Industri Usaha Bahan Bangunan",
                  label: "Industri Usaha Bahan Bangunan"
                },
                {
                  id: "Industri Usaha Makanan",
                  label: "Industri Usaha Makanan"
                },
                {
                  id: "Jaipongan",
                  label: "Jaipongan"
                },
                {
                  id: "Jasa Ekspedisi/Pengiriman Barang",
                  label: "Jasa Ekspedisi/Pengiriman Barang"
                },
                {
                  id: "Kelompok Simpan Pinjam",
                  label: "Kelompok Simpan Pinjam"
                },
                {
                  id: "Konsultan Manajemen",
                  label: "Konsultan Manajemen"
                },
                {
                  id: "Konsultan Teknis",
                  label: "Konsultan Teknis"
                },
                {
                  id: "Kontrakan Rumah",
                  label: "Kontrakan Rumah"
                },
                {
                  id: "Koperasi",
                  label: "Koperasi"
                },
                {
                  id: "Lembaga Keuangan Bukan Bank",
                  label: "Lembaga Keuangan Bukan Bank"
                },
                {
                  id: "Lembaga Perkreditan Rakyat",
                  label: "Lembaga Perkreditan Rakyat"
                },
                {
                  id: "Losmen",
                  label: "Losmen"
                },
                {
                  id: "Mess",
                  label: "Mess"
                },
                {
                  id: "Notaris",
                  label: "Notaris"
                },
                {
                  id: "Pedagang Pengumpul/Tengkulak",
                  label: "Pedagang Pengumpul/Tengkulak"
                },
                {
                  id: "Pegadaian",
                  label: "Pegadaian"
                },
                {
                  id: "Pejabat Pembuat Akta Tanah",
                  label: "Pejabat Pembuat Akta Tanah"
                },
                {
                  id: "Pengacara/Advokat",
                  label: "Pengacara/Advokat"
                },
                {
                  id: "Pengijon",
                  label: "Pengijon"
                },
                {
                  id: "Pengolahan Kayu",
                  label: "Pengolahan Kayu"
                },
                {
                  id: "Penitipan Kendaraan Bermotor",
                  label: "Penitipan Kendaraan Bermotor"
                },
                {
                  id: "Persewaan Kamar",
                  label: "Persewaan Kamar"
                },
                {
                  id: "Restoran",
                  label: "Restoran"
                },
                {
                  id: "Sandiwara/Drama",
                  label: "Sandiwara/Drama"
                },
                {
                  id: "Toko/ Swalayan",
                  label: "Toko/ Swalayan"
                },
                {
                  id: "Town House",
                  label: "Town House"
                },
                {
                  id: "Tukang Batu",
                  label: "Tukang Batu"
                },
                {
                  id: "Tukang Besi",
                  label: "Tukang Besi"
                },
                {
                  id: "Tukang Cukur",
                  label: "Tukang Cukur"
                },
                {
                  id: "Tukang Jahit/Bordir",
                  label: "Tukang Jahit/Bordir"
                },
                {
                  id: "Tukang Kayu",
                  label: "Tukang Kayu"
                },
                {
                  id: "Tukang Pijat/Urut",
                  label: "Tukang Pijat/Urut"
                },
                {
                  id: "Tukang Service Elektronik",
                  label: "Tukang Service Elektronik"
                },
                {
                  id: "Tukang Sumur",
                  label: "Tukang Sumur"
                },
                {
                  id: "Tukang Sumur",
                  label: "Tukang Sumur"
                },
                {
                  id: "Unit Usaha Simpan Pinjam",
                  label: "Unit Usaha Simpan Pinjam"
                },
                {
                  id: "Usaha Air Minum Dalam Kemasan",
                  label: "Usaha Air Minum Dalam Kemasan"
                },
                {
                  id: "Usaha Asuransi",
                  label: "Usaha Asuransi"
                },
                {
                  id: "Usaha Minuman",
                  label: "Usaha Minuman"
                },
                {
                  id: "Usaha Pasar Harian",
                  label: "Usaha Pasar Harian"
                },
                {
                  id: "Usaha Pasar Hasil Bumi Dan Tambang",
                  label: "Usaha Pasar Hasil Bumi Dan Tambang"
                },
                {
                  id: "Usaha Pasar Mingguan",
                  label: "Usaha Pasar Mingguan"
                },
                {
                  id: "Usaha Pasar Ternak",
                  label: "Usaha Pasar Ternak"
                },
                {
                  id: "Usaha Pengecer Gas Dan Bahan Bakar Minyak",
                  label: "Usaha Pengecer Gas Dan Bahan Bakar Minyak"
                },
                {
                  id: "Usaha Pengolahan dan Penjualan Hasil Hutan",
                  label: "Usaha Pengolahan dan Penjualan Hasil Hutan"
                },
                {
                  id: "Usaha Penyewaan Alat Pesta",
                  label: "Usaha Penyewaan Alat Pesta"
                },
                {
                  id: "Usaha Perdagangan Antar Pulau",
                  label: "Usaha Perdagangan Antar Pulau"
                },
                {
                  id: "Usaha Perikanan",
                  label: "Usaha Perikanan"
                },
                {
                  id: "Usaha Perkebunan",
                  label: "Usaha Perkebunan"
                },
                {
                  id: "Usaha Persewaan Tenaga Listrik",
                  label: "Usaha Persewaan Tenaga Listrik"
                },
                {
                  id: "Usaha Peternakan",
                  label: "Usaha Peternakan"
                },
                {
                  id: "Villa",
                  label: "Villa"
                },
                {
                  id: "Warung Kelontongan/Kios",
                  label: "Warung Kelontongan/Kios"
                },
                {
                  id: "Wayang Orang/Golek",
                  label: "Wayang Orang/Golek"
                },
                {
                  id: "Wisma",
                  label: "Wisma"
                }
              ]
        },
        renderer: chosenRenderer,
        editor: editors.chosen,
        width: 200
    },
]

export default schema;