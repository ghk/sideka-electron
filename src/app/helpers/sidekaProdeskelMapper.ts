const GENDER = {'Laki - laki': 'Laki-Laki', 'Perempuan': 'Perempuan', 'L': 'Laki-Laki', 'P': 'Perempuan', '1': 'Laki-Laki', '2': 'Perempuan'};
const NATIONALITY = {'WNI': 'Warga Negara Indonesia', 'WNA': 'Warga Negara Asing', 'DWIKEWARGANEGARAAN': 'Dwi Kewarganegaraan'};
const RELIGION = {'Aliran Kepercayaan Lainnya': 'Kepercayaan Kepada Tuhan YME'};
const MARITAL_STATUS = {'Cerai Hidup': 'Janda/Duda', 'Cerai Mati': 'Janda/Duda'};
const BLOOD_TYPE = {'A+': 'A', 'B+': 'B', 'B-': 'B', 'AB+': 'AB', 'AB-': 'AB', 'O-': 'O', 'O+': 'O', 'Tidak Diketahui': 'Tidak Tahu'};
const FAMILY_REL = {'Anak': 'Anak Kandung'};
const EDUCATION =  {'Tidak Pernah Sekolah': 'Tidak pernah sekolah', 
                    'Putus Sekolah': 'Tidak pernah sekolah',
                    'Tidak dapat membaca': 'Tidak pernah sekolah',
                    'Tidak Tamat SD/Sederajat': 'Tidak tamat SD/sederajat',
                    'Belum Masuk TK/PAUD': 'Belum masuk TK/Kelompok Bermain',
                    'Sedang TK/PAUD': 'Sedang TK/Kelompok Bermain',
                    'Sedang SD/Sederajat': 'Sedang SD/sederajat',
                    'Sedang SMP/Sederajat': 'Sedang SLTP/sederajat',
                    'Sedang SMA/Sederajat': 'Sedang SLTA/sederajat',
                    'Sedang D-3/Sederajat': 'Sedang D-3/sederajat',
                    'Sedang S-1/Sederajat': 'Sedang S-1/sederajat',
                    'Sedang S-2/Sederajat': 'Sedang S-2/sederajat',
                    'Sedang S-3/Sederajat': 'Sedang S-3/sederajat',
                    'Tamat SD/Sederajat': 'Tamat SD/sederajat',
                    'Tamat SMP/Sederajat': 'Tamat SLTP/sederajat',
                    'Tamat SMA/Sederajat': 'Tamat SLTA/sederajat',
                    'Tamat D-3/Sederajat': 'Tamat D-3/sedarajat',
                    'Tamat S-1/Sederajat': 'Tamat S-1/sederajat',
                    'Tamat S-2/Sederajat': 'Tamat S-2/sederajat',
                    'Tamat S-3/Sederajat': 'Tamat S-3/sederajat',
                    'Tidak/Belum Sekolah': 'Belum masuk TK/Kelompok Bermain',
                    'SD/Sederajat': 'Sedang SD/sederajat',
                    'SLTP/Sederajat': 'Sedang SLTP/sederajat',
                    'SLTA/Sederajat': 'Sedang SLTA/sederajat',
                    'BELUM TAMAT SD/SEDERAJAT': 'Sedang SD/sederajat',
                    'Diploma I/II': 'Sedang D-3/sederajat',
                    'Diploma I/III': 'Sedang D-3/sederajat'
                  };

const JOB = {'BELUM/TIDAK BEKERJA': 'Belum Bekerja',
             'MENGURUS RUMAH TANGGA': 'Ibu Rumah Tangga',
             'PELAJAR/MAHASISWA': 'Pelajar',
             'PENSIUNAN': 'Purnawirawan/Pensiunan',
             'PEGAWAI NEGERI SIPIL (PNS)': 'Pegawai Negeri Sipil',
             'TENTARA NASIONAL INDONESIA (TNI)': 'TNI',
             'KEPOLISIAN RI': 'POLRI',
             'PERDAGANGAN': 'Buruh jasa perdagangan hasil bumi',
             'PETANI/PEKEBUN': 'Petani',
             'PETERNAK': 'Peternak',
             'NELAYAN/PERIKANAN': 'Nelayan',
             'INDUSTRI': 'Penrajin industri rumah tangga lainnya',
             'KONSTRUKSI': 'Kontraktor',
             'TRANSPORTASI': 'Buruh usaha jasa transportasi dan perhubungan',
             'KARYAWAN SWASTA': 'Karyawan Perusahaan Swasta',
             'KARYAWAN BUMN': 'Karyawan Perusahaan Pemerintah',
             'KARYAWAN HONORER': 'Karyawan Honorer',
             'BURUH HARIAN LEPAS': 'Buruh Harian Lepas',
             'BURUH TANI/PERKEBUNAN': 'Buruh Tani',
             'BURUH NELAYAN/PERIKANAN': 'Nelayan',
             'BURUH PETERNAKAN': 'Peternak',
             'PEMBANTU RUMAH TANGGA': 'Pembantu rumah tangga',
             'TUKANG CUKUR': 'Tukang Cukur',
             'TUKANG BATU': 'Tukang Batu',
             'TUKANG LISTRIK': 'Tukang Listrik',
             'TUKANG KAYU': 'Tukang Kayu',
             'TUKANG SOL SEPATU': 'Wiraswasta',
             'TUKANG LAS/PANDAI BESI': 'Tukang Las',
             'TUKANG JAIT': 'Tukang Jahit',
             'TUKANG GIGI': 'Tukang Gigi',
             'PENATA RIAS': 'Tukang Rias',
             'PENATA BUSANA': 'Wiraswasta',
             'PENATA RAMBUT': 'Tukang Rias',
             'MEKANIK': 'Montir',
             'SENIMAN': 'Seniman/artis',
             'TABIB': 'Dokter swasta',
             'PARAJI': 'Dukun Tradisional',
             'PERANCANG BUSANA': 'Arsitektur/Desainer',
             'PENTERJEMAH': 'Wiraswasta',
             'IMAM MASJID': 'Pemuka Agama',
             'PENDETA': 'Pemuka Agama',
             'PASTOR': 'Pemuka Agama',
             'WARTAWAN': 'Wartawan',
             'USTADZ/MUBALIGH': 'Pemuka Agama',
             'JURU MASAK': 'Juru Masak',
             'PROMOTOR ACARA': 'Wiraswasta',
             'ANGGOTA DPR RI': 'Anggota Legislatif',
             'ANGGOTA DPD': 'Anggota Legislatif',
             'ANGGOTA BPK': 'Anggota Legislatif',
             'PRESIDEN': 'Presiden',
             'WAKIL PRESIDEN': 'Wakil presiden',
             'ANGGOTA MAHKAMAH KONSTITUSI': 'Anggota mahkamah konstitusi',
             'DUTA BESAR': 'Duta besar',
             'GUBERNUR': 'Gubernur',
             'WAKIL GUBERNUR': 'Wakil Gubernur',
             'BUPATI': 'Bupati/walikota',
             'WAKIL BUPATI': 'Wakil bupati',
             'WALIKOTA': 'Bupati/walikota',
             'WAKIL WALIKOTA': 'Wakil bupati',
             'ANGGOTA DPRD PROP': 'Anggota Legislatif',
             'ANGGOTA DPRD KAB. KOTA': 'Anggota Legislatif',
             'DOSEN': 'Dosen swasta',
             'GURU': 'Guru swasta',
             'PILOT': 'Pilot',
             'PENGACARA': 'Pengacara',
             'NOTARIS': 'Notaris',
             'ARSITEK': 'Arsitektur/Desainer',
             'AKUNTAN': 'Akuntan',
             'KONSULTAN': 'Konsultan Managemen dan Teknis',
             'DOKTER': 'Dokter Swasta',
             'BIDAN': 'Bidan swasta',
             'PERAWAT': 'Perawat swasta',
             'APOTEKER': 'Apoteker',
             'PSIKIATER/PSIKOLOG': 'Psikiater/Psikolog',
             'PENYIAR TELEVISI': 'Penyiar radio',
             'PENYIAR RADIO': 'Penyiar radio',
             'PELAUT': 'Nelayan',
             'PENELITI': 'Dosen swasta',
             'SOPIR': 'Sopir',
             'PIALANG': 'Pialang',
             'PARANORMAL': 'Dukun/paranormal/supranatural',
             'PEDAGANG': 'Pedagang Keliling',
             'PERANGKAT DESA': 'Perangkat Desa',
             'KEPALA DESA': 'Kepala Daerah',
             'BIARAWATI': 'Pemuka Agama',
             'WIRASWASTA': 'Wiraswasta',
             'BURUH MIGRAN': 'Buruh Migran'
            };

export default class SidekaProdeskelMapper {
    static mapGender(data): any {
        let lowerType = SidekaProdeskelMapper.getLowerValues('GENDER');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];

        return data;
    }

    static mapEducation(data): any {
        let lowerType = SidekaProdeskelMapper.getLowerValues('EDUCATION');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapJob(data): any {
        let lowerType = SidekaProdeskelMapper.getLowerValues('JOB');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapFamilyRelation(data): any {
         let lowerType = SidekaProdeskelMapper.getLowerValues('FAMILY_REL');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapBloodType(data): any {
         let lowerType = SidekaProdeskelMapper.getLowerValues('BLOOD_TYPE');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapReligion(data): any {
         let lowerType = SidekaProdeskelMapper.getLowerValues('RELIGION');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapNationality(data): any {
       let lowerType = SidekaProdeskelMapper.getLowerValues('NATIONALITY');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

     static mapMaritalStatus(data): any {
       let lowerType = SidekaProdeskelMapper.getLowerValues('MARITAL_STATUS');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static getLowerValues(type): any {
        let typeKeys = [];
        let lowerKeys = {};

        switch(type) {
            case 'GENDER':
              typeKeys = Object.keys(GENDER);
              
              typeKeys.forEach(typeKey => {
                 lowerKeys[typeKey.toLowerCase()] = GENDER[typeKey];
              });
              break;
            case 'EDUCATION':
              typeKeys = Object.keys(EDUCATION);
              typeKeys.forEach(typeKey => {
                 lowerKeys[typeKey.toLowerCase()] = EDUCATION[typeKey];
              });
              break;
            case 'JOB':
              typeKeys = Object.keys(JOB);
               typeKeys.forEach(typeKey => {
                 lowerKeys[typeKey.toLowerCase()] = JOB[typeKey];
              });
              break;
            case 'FAMILY_REL':
              typeKeys = Object.keys(FAMILY_REL);
               typeKeys.forEach(typeKey => {
                 lowerKeys[typeKey.toLowerCase()] = FAMILY_REL[typeKey];
              });
              break;
            case 'BLOOD_TYPE':
              typeKeys = Object.keys(BLOOD_TYPE);
              typeKeys.forEach(typeKey => {
                 lowerKeys[typeKey.toLowerCase()] = BLOOD_TYPE[typeKey];
              });
              break;
            case 'RELIGION':
              typeKeys = Object.keys(RELIGION);
              typeKeys.forEach(typeKey => {
                 lowerKeys[typeKey.toLowerCase()] = RELIGION[typeKey];
              });
              break;
            case 'MARITAL_STATUS':
              typeKeys = Object.keys(MARITAL_STATUS);
              typeKeys.forEach(typeKey => {
                 lowerKeys[typeKey.toLowerCase()] = MARITAL_STATUS[typeKey];
              });
              break;
            case 'NATIONALITY':
              typeKeys = Object.keys(NATIONALITY);
            typeKeys.forEach(typeKey => {
                 lowerKeys[typeKey.toLowerCase()] = NATIONALITY[typeKey];
              });
              break;
        }
    

        return lowerKeys;
    }
}