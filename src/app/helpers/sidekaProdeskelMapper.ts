const GENDER = {'Laki - laki': 'Laki-Laki', 'Perempuan': 'Perempuan', 'L': 'Laki-Laki', 'P': 'Perempuan', '1': 'Laki-Laki', '2': 'Perempuan'};
const NATIONALITY = {'WNI': 'Warga Negara Indonesia', 'WNA': 'Warga Negara Asing', 'DWIKEWARGANEGARAAN': 'Dwi Kewarganegaraan'};
const RELIGION = {'Aliran Kepercayaan Lainnya': 'Kepercayaan Kepada Tuhan YME'};
const MARITAL_STATUS = {'Cerai Hidup': 'Janda/Duda', 'Cerai Mati': 'Janda/Duda'};
const BLOOD_TYPE = {'A+': 'A', 'B+': 'B', 'B-': 'B', 'AB+': 'AB', 'AB-': 'AB', 'O-': 'O', 'O+': 'O', 'Tidak Diketahui': 'Tidak Tahu'};
const FAMILY_REL = {'Anak': 'Anak Kandung', 'KK': 'Kepala Keluarga'};
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

const GENDER_SYNC = {'Laki-Laki': '0', 'Perempuan': '1' };
const FAMILY_REL_SYNC = {"Adik":"11","Anak Angkat":"5","Anak Kandung":"4","Anak Tiri":"23","Ayah":"6","Cucu":"18","Famili lain":"19","Ibu":"7","Istri":"3","Kakak":"10","Kakek":"12","Kepala Keluarga":"1","Keponakan":"15","Lainnya":"22","Menantu":"21","Mertua":"17","Nenek":"13","Paman":"8","Sepupu":"14","Suami":"2","Tante":"9","Teman":"16"};
const EDUCATION_SYNC = {"Belum masuk TK/Kelompok Bermain":"1","Sedang TK/Kelompok Bermain":"2","Sedang SD/sederajat":"4","Sedang SLTP/Sederajat":"7","Sedang SLTA/sederajat":"9","Sedang D-1/sederajat":"11","Sedang D-2/sederajat":"13","Sedang D-3/sederajat":"15","Sedang S-1/sederajat":"17","Sedang S-2/sederajat":"19","Sedang S-3/sederajat":"21","Tamat SD/sederajat":"5","Tamat SLTP/sederajat":"8","Tamat SLTA/sederajat":"10","Tamat D-1/sederajat":"12","Tamat D-2/sederajat":"14","Tamat D-3/sederajat":"30","Tamat D-4/sederajat":"16","Tamat S-1/sederajat":"18","Tamat S-2/sederajat":"20","Tamat S-3/sederajat":"22","Sedang SLB A/sederajat":"23","Sedang SLB B/sederajat":"25","Sedang SLB C/sederajat":"27","Tamat SLB A/sederajat":"24","Tamat SLB B/sederajat":"26","Tamat SLB C/sederajat":"28","Tidak pernah sekolah":"3","Tidak dapat membaca dan menulis huruf Latin/Arab":"29","Tidak tamat SD/sederajat":"6"};
const JOB_SYNC = {"Ahli Pengobatan Alternatif":"15","Akuntan":"112","Anggota kabinet kementrian":"100","Anggota Legislatif":"93","Anggota mahkamah konstitusi":"99","Apoteker":"96","Arsitektur/Desainer":"31","Belum Bekerja":"37","Bidan swasta":"14","Bupati/walikota":"110","Buruh Harian Lepas":"42","Buruh jasa perdagangan hasil bumi":"57","Buruh Migran":"3","Buruh Tani":"2","Buruh usaha hotel dan penginapan lainnya":"66","Buruh usaha jasa hiburan dan pariwisata":"64","Buruh usaha jasa informasi dan komunikasi":"61","Buruh usaha jasa transportasi dan perhubungan":"59","Dokter swasta":"12","Dosen swasta":"20","Dukun Tradisional":"30","Dukun/paranormal/supranatural":"68","Duta besar":"101","Gubernur":"102","Guru swasta":"19","Ibu Rumah Tangga":"39","Jasa Konsultansi Manajemen dan Teknis":"82","Jasa pengobatan alternatif":"69","Jasa penyewaan peralatan pesta":"74","Juru Masak":"83","Karyawan Honorer":"84","Karyawan Perusahaan Pemerintah":"33","Karyawan Perusahaan Swasta":"32","Kepala Daerah":"94","Konsultan Manajemen dan Teknis":"35","Kontraktor":"62","Montir":"11","Nelayan":"10","Notaris":"29","Pedagang barang kelontong":"8","Pedagang Keliling":"22","Pegawai Negeri Sipil":"5","Pelajar":"38","Pelaut":"106","Pembantu rumah tangga":"27","Pemilik perusahaan":"55","Pemilik usaha hotel dan penginapan lainnya":"65","Pemilik usaha informasi dan komunikasi":"60","Pemilik usaha jasa hiburan dan pariwisata":"63","Pemilik usaha jasa transportasi dan perhubungan":"58","Pemilik usaha warung, rumah makan dan restoran":"67","Pemuka Agama":"92","Pemulung":"75","Penambang":"23","Peneliti":"107","Pengacara":"28","Pengrajin":"7","Pengrajin industri rumah tangga lainnya":"76","Pengusaha kecil, menengah dan besar":"18","Pengusaha perdagangan hasil bumi":"56","Penyiar radio":"105","Perangkat Desa":"41","Perawat swasta":"13","Petani":"1","Peternak":"9","Pialang":"85","Pilot":"104","POLRI":"17","Presiden":"97","Pskiater/Psikolog":"86","Purnawirawan/Pensiunan":"40","Satpam/Security":"108","Seniman/artis":"21","Sopir":"70","Tidak Mempunyai Pekerjaan Tetap":"36","TNI":"16","Tukang Anyaman":"77","Tukang Batu":"25","Tukang Cuci":"26","Tukang Cukur":"88","Tukang Gigi":"90","Tukang Jahit":"78","Tukang Kayu":"24","Tukang Kue":"79","Tukang Las":"89","Tukang Listrik":"91","Tukang Rias":"80","Tukang Sumur":"81","Usaha jasa pengerah tenaga kerja":"71","Wakil bupati":"103","Wakil Gubernur":"109","Wakil presiden":"98","Wartawan":"87","Wiraswasta":"34"};
const MARITAL_STATUS_SYNC = {'Belum Kawin': '0', 'Kawin': '1', 'Janda/Duda': '2'};
const RELIGION_SYNC = {"Budha":"5","Hindu":"4","Islam":"1","Katholik":"3","Kepercayaan Kepada Tuhan YME":"7","Konghucu":"6","Kristen":"2"};
const BLOOD_TYPE_SYNC = {"O":"0","A":"1","B":"2","AB":"3","Tidak Tahu":"4"};
const NATIONALITY_SYNC = {"Warga Negara Indonesia":"1","Warga Negara Asing":"2","Dwi Kewarganegaraan":"3"};

export class SidekaProdeskelMapper {
    static mapGender(data): any {
        if(!data)
            return null;

        let lowerType = SidekaProdeskelMapper.getLowerValues('GENDER');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];

        return data;
    }

    static mapEducation(data): any {
         if(!data)
            return null;

        let lowerType = SidekaProdeskelMapper.getLowerValues('EDUCATION');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapJob(data): any {
         if(!data)
            return null;
         
        let lowerType = SidekaProdeskelMapper.getLowerValues('JOB');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapFamilyRelation(data): any {
         if(!data)
            return null;

         let lowerType = SidekaProdeskelMapper.getLowerValues('FAMILY_REL');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapBloodType(data): any {
         if(!data)
            return null;

         let lowerType = SidekaProdeskelMapper.getLowerValues('BLOOD_TYPE');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapReligion(data): any {
         if(!data)
            return null;

        let lowerType = SidekaProdeskelMapper.getLowerValues('RELIGION');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapNationality(data): any {
         if(!data)
            return null;

       let lowerType = SidekaProdeskelMapper.getLowerValues('NATIONALITY');

        if(lowerType[data.toLowerCase()])
            return lowerType[data.toLowerCase()];
       
        return data;
    }

    static mapMaritalStatus(data): any {
          if(!data)
            return null;

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

    static mapSyncGender(data): any {
        if(!data)
            return null;

        let mappedData = SidekaProdeskelMapper.mapGender(data);

        return GENDER_SYNC[mappedData] ? GENDER_SYNC[mappedData] : mappedData;
    }

    static mapSyncEducation(data): any {
        if(!data)
            return null;
        
        let mappedData = SidekaProdeskelMapper.mapEducation(data);

        return EDUCATION_SYNC[mappedData] ? EDUCATION_SYNC[data] : mappedData;
    }

    static mapSyncJob(data): any {
        if(!data)
            return null;

        let mappedData = SidekaProdeskelMapper.mapJob(data);
        return GENDER_SYNC[mappedData] ? GENDER_SYNC[mappedData] : mappedData;
    }

    static mapSyncFamilyRelation(data): any {
        if(!data)
            return null;

        let mappedData = SidekaProdeskelMapper.mapFamilyRelation(data);
        return FAMILY_REL_SYNC[ mappedData] ? FAMILY_REL_SYNC[ mappedData] : mappedData;
    }

    static mapSyncBloodType(data): any {
        if(!data)
            return null;

        let mappedData = SidekaProdeskelMapper.mapBloodType(data);
        return BLOOD_TYPE_SYNC[mappedData] ? BLOOD_TYPE_SYNC[mappedData] : mappedData;
    }

    static mapSyncReligion(data): any {
        if(!data)
            return null;

        let mappedData = SidekaProdeskelMapper.mapReligion(data);
        return RELIGION_SYNC[mappedData] ? RELIGION_SYNC[mappedData] : mappedData;
    }

    static mapSyncNationality(data): any {
        if(!data)
            return null;
        
        let mappedData = SidekaProdeskelMapper.mapNationality(data);
        return NATIONALITY_SYNC[mappedData] ? NATIONALITY_SYNC[mappedData] : data;
    }

    static mapSyncMaritalStatus(data): any {
        if(!data)
            return null;
        
        let mappedData = SidekaProdeskelMapper.mapMaritalStatus(data);
        return MARITAL_STATUS_SYNC[mappedData] ? MARITAL_STATUS_SYNC[mappedData] : mappedData;
    }
}