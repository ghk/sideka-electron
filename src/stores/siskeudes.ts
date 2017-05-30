/// <reference path="../../app/typings/index.d.ts" />
import * as xlsx from 'xlsx'; 
import * as ADODB from "node-adodb";

const queryRPJM = `SELECT   Ta_RPJM_Visi.TahunA AS Tahun_Awal, Ta_RPJM_Visi.TahunN AS Tahun_Akhir, Ta_RPJM_Visi.TahunA, Ta_RPJM_Visi.TahunN, Ta_RPJM_Kegiatan.Kd_Bid, 
                            Ta_RPJM_Bidang.Nama_Bidang, Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Kegiatan.Nama_Kegiatan, Ta_RPJM_Kegiatan.Lokasi, Ta_RPJM_Pagu_Tahunan.Waktu, 
                            Ta_RPJM_Kegiatan.Sasaran, Ta_RPJM_Kegiatan.Tahun1, Ta_RPJM_Kegiatan.Tahun2, Ta_RPJM_Kegiatan.Tahun3, Ta_RPJM_Kegiatan.Tahun4, 
                            Ta_RPJM_Kegiatan.Tahun5, Ta_RPJM_Kegiatan.Tahun6, Ta_RPJM_Pagu_Tahunan.Biaya, Ta_RPJM_Kegiatan.Sumberdana, Ta_RPJM_Kegiatan.Swakelola, 
                            Ta_RPJM_Kegiatan.Kerjasama, Ta_RPJM_Kegiatan.Pihak_Ketiga, Ta_RPJM_Pagu_Tahunan.Volume, Ta_RPJM_Pagu_Tahunan.Satuan,  
                            [Ta_RPJM_Pagu_Tahunan.Volume] & ' ' & [Ta_RPJM_Pagu_Tahunan.Satuan] AS Volume, Ta_RPJM_Visi.Kd_Desa, Ta_RPJM_Pagu_Tahunan.Pelaksana
                    FROM    (Ta_RPJM_Pagu_Tahunan INNER JOIN
                            (((((Ta_RPJM_Misi INNER JOIN
                            Ta_RPJM_Visi ON Ta_RPJM_Misi.ID_Visi = Ta_RPJM_Visi.ID_Visi) INNER JOIN
                            Ta_RPJM_Tujuan ON Ta_RPJM_Misi.ID_Misi = Ta_RPJM_Tujuan.ID_Misi) INNER JOIN
                            Ta_RPJM_Sasaran ON Ta_RPJM_Tujuan.ID_Tujuan = Ta_RPJM_Sasaran.ID_Tujuan) INNER JOIN
                            Ta_RPJM_Kegiatan ON Ta_RPJM_Sasaran.ID_Sasaran = Ta_RPJM_Kegiatan.Kd_Sas) INNER JOIN
                            Ta_RPJM_Bidang ON Ta_RPJM_Kegiatan.Kd_Bid = Ta_RPJM_Bidang.Kd_Bid) ON Ta_RPJM_Pagu_Tahunan.Kd_Keg = Ta_RPJM_Kegiatan.Kd_Keg)`;

const queryRenstraRPJM = `SELECT        Ta_RPJM_Visi.ID_Visi, Ta_RPJM_Misi.ID_Misi, Ta_RPJM_Tujuan.ID_Tujuan, Ta_RPJM_Sasaran.ID_Sasaran, Ta_RPJM_Visi.Uraian_Visi, Ta_RPJM_Misi.Uraian_Misi, Ta_RPJM_Tujuan.Uraian_Tujuan, 
                                    Ta_RPJM_Sasaran.Uraian_Sasaran
                            FROM    ((((Ta_Desa INNER JOIN
                                    Ta_RPJM_Visi ON Ta_Desa.Kd_Desa = Ta_RPJM_Visi.Kd_Desa) LEFT OUTER JOIN
                                    Ta_RPJM_Misi ON Ta_RPJM_Visi.ID_Visi = Ta_RPJM_Misi.ID_Visi) LEFT OUTER JOIN
                                    Ta_RPJM_Tujuan ON Ta_RPJM_Misi.ID_Misi = Ta_RPJM_Tujuan.ID_Misi) LEFT OUTER JOIN
                                    Ta_RPJM_Sasaran ON Ta_RPJM_Tujuan.ID_Tujuan = Ta_RPJM_Sasaran.ID_Tujuan)`;

const queryVisiRPJM = `SELECT   Ta_RPJM_Visi.*
                        FROM    (Ta_Desa INNER JOIN Ta_RPJM_Visi ON Ta_Desa.Kd_Desa = Ta_RPJM_Visi.Kd_Desa)`;

const queryRAB = `SELECT    RAB.Tahun, RAB.Kd_Desa, RefDs.Nama_Desa, Rek1.NoLap, Rek1.Akun, Rek1.Nama_Akun, Bdg.Kd_Bid, Bdg.Nama_Bidang, Keg.Kd_Keg, Keg.Nama_Kegiatan, Rek2.Kelompok, Rek2.Nama_Kelompok, Rek3.Jenis, 
                            Rek3.Nama_Jenis, Rek4.Obyek, Rek4.Nama_Obyek, RABSub.Kd_SubRinci, RABSub.Nama_SubRinci, RABRi.No_Urut, RABRi.Uraian, RABRi.JmlSatuan, RABRi.Satuan, RABRi.HrgSatuan, RABRi.Anggaran, 
                            RABRi.SumberDana AS Sumber, Keg.Sumberdana AS SumberKeg, Ds.Nm_Kades, Ds.Jbt_Kades, Ds.Nm_Sekdes, Ds.Jbt_Sekdes, Keg.Nm_PPTKD, Keg.Waktu, Keg.Lokasi, Keg.Keluaran, [Rek4.Obyek] & [RABSub.Kd_SubRinci] AS Kode_SubRinci

                    FROM    ((((Ref_Rek1 Rek1 INNER JOIN
                            Ref_Rek2 Rek2 ON Rek1.Akun = Rek2.Akun) INNER JOIN
                            (Ref_Rek3 Rek3 INNER JOIN
                            Ref_Rek4 Rek4 ON Rek3.Jenis = Rek4.Jenis) ON Rek2.Kelompok = Rek3.Kelompok) INNER JOIN
                            (Ta_RABRinci RABRi INNER JOIN
                            (Ta_Bidang Bdg RIGHT OUTER JOIN
                            (Ref_Desa RefDs INNER JOIN
                            ((Ta_RAB RAB INNER JOIN
                            Ta_Desa Ds ON RAB.Tahun = Ds.Tahun AND RAB.Kd_Desa = Ds.Kd_Desa) LEFT OUTER JOIN
                            Ta_Kegiatan Keg ON RAB.Tahun = Keg.Tahun AND RAB.Kd_Keg = Keg.Kd_Keg) ON RefDs.Kd_Desa = Ds.Kd_Desa) ON Bdg.Tahun = Keg.Tahun AND Bdg.Kd_Bid = Keg.Kd_Bid) ON RABRi.Tahun = RAB.Tahun AND 
                            RABRi.Kd_Desa = RAB.Kd_Desa AND RABRi.Kd_Keg = RAB.Kd_Keg AND RABRi.Kd_Rincian = RAB.Kd_Rincian) ON Rek4.Obyek = RAB.Kd_Rincian) LEFT OUTER JOIN
                            Ta_RABSub RABSub ON RABRi.Tahun = RABSub.Tahun AND RABRi.Kd_Desa = RABSub.Kd_Desa AND RABRi.Kd_Keg = RABSub.Kd_Keg AND RABRi.Kd_Rincian = RABSub.Kd_Rincian AND 
                            RABRi.Kd_SubRinci = RABSub.Kd_SubRinci) `;

const querySumRAB =`SELECT  RAB.Tahun, Rek1.Nama_Akun, SUM(RABRi.Anggaran) AS Anggaran, Rek2.Akun, Ds.Kd_Desa
                    FROM    ((((Ref_Rek2 Rek2 INNER JOIN
                            Ref_Rek1 Rek1 ON Rek2.Akun = Rek1.Akun) INNER JOIN
                            Ref_Rek3 Rek3 ON Rek2.Kelompok = Rek3.Kelompok) INNER JOIN
                            Ref_Rek4 Rek4 ON Rek3.Jenis = Rek4.Jenis) INNER JOIN
                            (Ta_Desa Ds INNER JOIN
                            (Ta_RAB RAB INNER JOIN
                            Ta_RABRinci RABRi ON RAB.Kd_Rincian = RABRi.Kd_Rincian AND RAB.Kd_Keg = RABRi.Kd_Keg AND RAB.Kd_Desa = RABRi.Kd_Desa AND RAB.Tahun = RABRi.Tahun) ON Ds.Tahun = RAB.Tahun AND 
                            Ds.Kd_Desa = RAB.Kd_Desa) ON Rek4.Obyek = RAB.Kd_Rincian)
                    GROUP BY RAB.Tahun, Rek1.Nama_Akun, Rek2.Akun, Ds.Kd_Desa
                    ORDER BY Rek2.Akun`;

const queryDetailSPP=`SELECT    S.Keterangan, RS.Nama_SubRinci, SB.Keterangan AS Keterangan_Bukti, SR.Sumberdana, SR.Nilai, S.No_SPP, SR.Kd_Rincian, SB.Nm_Penerima, SB.Tgl_Bukti, SB.Rek_Bank, SB.Nm_Bank, SB.NPWP, 
                                SB.Nilai AS Nilai_SPP_Bukti, SB.No_Bukti, SB.Alamat, SR.Kd_Keg, SPo.Nilai AS Nilai_SPPPot, S.Tgl_SPP, SPo.Kd_Rincian AS Kd_Potongan, Rek4.Nama_Obyek
                        FROM    ((Ref_Rek4 Rek4 RIGHT OUTER JOIN
                                Ta_SPPPot SPo ON Rek4.Obyek = SPo.Kd_Rincian) RIGHT OUTER JOIN
                                (((Ta_SPPRinci SR INNER JOIN
                                Ta_SPP S ON SR.No_SPP = S.No_SPP) INNER JOIN
                                Ta_RABSub RS ON SR.Kd_Rincian = RS.Kd_Rincian) LEFT OUTER JOIN
                                Ta_SPPBukti SB ON SR.No_SPP = SB.No_SPP AND SR.Kd_Keg = SB.Kd_Keg AND SR.Kd_Rincian = SB.Kd_Rincian AND SR.Sumberdana = SB.Sumberdana) ON SPo.No_Bukti = SB.No_Bukti)`;

const queryGetAllKegiatan = `SELECT     Keg.* 
                             FROM       (Ta_Desa Ds INNER JOIN Ta_Kegiatan Keg ON Ds.Tahun = Keg.Tahun AND Ds.Kd_Desa = Keg.Kd_Desa)`;

const queryGetBidAndKeg =`SELECT        Ta_Bidang.Kd_Bid, Ta_Bidang.Nama_Bidang, Ta_Kegiatan.Kd_Keg, Ta_Kegiatan.Nama_Kegiatan, Ta_Kegiatan.Pagu
                            FROM    ((Ta_Bidang INNER JOIN
                                    Ta_Kegiatan ON Ta_Bidang.Tahun = Ta_Kegiatan.Tahun AND Ta_Bidang.Kd_Bid = Ta_Kegiatan.Kd_Bid) INNER JOIN
                                    Ta_Desa ON Ta_Bidang.Tahun = Ta_Desa.Tahun AND Ta_Bidang.Kd_Desa = Ta_Desa.Kd_Desa)`

const querySPP = `SELECT    Ta_SPP.No_SPP, Ta_SPP.Tgl_SPP, Ta_SPP.Jn_SPP, Ta_SPP.Keterangan, Ta_SPP.Jumlah, Ta_SPP.Potongan, Ta_SPP.Tahun, Ds.Kd_Desa
                  FROM      (Ta_Desa Ds INNER JOIN Ta_SPP ON Ds.Kd_Desa = Ta_SPP.Kd_Desa) ORDER BY Ta_SPP.No_SPP`;

const queryRABSub = `SELECT     Ta_RAB.Kd_Rincian, Ta_RABSub.Nama_SubRinci, Ta_RAB.Anggaran, Ta_RABRinci.SumberDana AS Sumberdana
                     FROM       ((Ta_RAB INNER JOIN
                                Ta_RABSub ON Ta_RAB.Tahun = Ta_RABSub.Tahun AND Ta_RAB.Kd_Desa = Ta_RABSub.Kd_Desa AND Ta_RAB.Kd_Keg = Ta_RABSub.Kd_Keg AND Ta_RAB.Kd_Rincian = Ta_RABSub.Kd_Rincian) INNER JOIN
                                Ta_RABRinci ON Ta_RABSub.Tahun = Ta_RABRinci.Tahun AND Ta_RABSub.Kd_Desa = Ta_RABRinci.Kd_Desa AND Ta_RABSub.Kd_Keg = Ta_RABRinci.Kd_Keg AND Ta_RABSub.Kd_Rincian = Ta_RABRinci.Kd_Rincian AND 
                                Ta_RABSub.Kd_SubRinci = Ta_RABRinci.Kd_SubRinci)`;

const querySisaAnggaranRAB = `SELECT       Ta_RAB.Kd_Keg, Ta_RAB.Kd_Rincian, Ta_SPPRinci.Sumberdana, Ref_Rek4.Obyek, Ref_Rek4.Nama_Obyek, Ta_RAB.Anggaran, Ta_RAB.Anggaran - SUM(Ta_SPPRinci.Nilai) AS Sisa
                            FROM        ((((Ta_RAB INNER JOIN
                                        Ta_SPPRinci ON Ta_RAB.Kd_Keg = Ta_SPPRinci.Kd_Keg AND Ta_RAB.Kd_Rincian = Ta_SPPRinci.Kd_Rincian) INNER JOIN
                                        Ta_Kegiatan ON Ta_RAB.Tahun = Ta_Kegiatan.Tahun AND Ta_RAB.Kd_Keg = Ta_Kegiatan.Kd_Keg) INNER JOIN
                                        Ta_Desa ON Ta_Kegiatan.Kd_Desa = Ta_Desa.Kd_Desa) INNER JOIN
                                        Ref_Rek4 ON Ta_RAB.Kd_Rincian = Ref_Rek4.Obyek)`;

const queryGetKodeKegiatan = `SELECT    Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Kegiatan.Nama_Kegiatan, Ta_RPJM_Kegiatan.Sumberdana
                              FROM      ((Ta_Desa INNER JOIN
                                        Ta_RABSub ON Ta_Desa.Kd_Desa = Ta_RABSub.Kd_Desa) LEFT OUTER JOIN
                                        Ta_RPJM_Kegiatan ON Ta_RABSub.Kd_Keg = Ta_RPJM_Kegiatan.Kd_Keg) `;

const queryRefPotongan =`SELECT Ref_Potongan.*, Ref_Rek4.*
                        FROM    (Ref_Potongan INNER JOIN Ref_Rek4 ON Ref_Potongan.Kd_Rincian = Ref_Rek4.Obyek)`;

const queryGetRefRek = `SELECT      Rek1.Akun, Rek1.Nama_Akun, Rek2.Kelompok, Rek2.Nama_Kelompok, Rek3.Jenis, Rek3.Nama_Jenis, Rek4.Obyek, Rek4.Nama_Obyek
                        FROM        (((Ref_Rek1 Rek1 INNER JOIN
                                    Ref_Rek2 Rek2 ON Rek1.Akun = Rek2.Akun) INNER JOIN
                                    Ref_Rek3 Rek3 ON Rek2.Kelompok = Rek3.Kelompok) INNER JOIN
                                    Ref_Rek4 Rek4 ON Rek3.Jenis = Rek4.Jenis) `;

const queryRefSumberdana = `SELECT  Kode, Nama_Sumber, Urut
                            FROM    Ref_Sumber
                            ORDER BY Urut`

const queryFixMultipleMisi = `ALTER TABLE Ta_RPJM_Tujuan DROP CONSTRAINT Kd_Visi;
                            ALTER TABLE Ta_RPJM_Sasaran DROP CONSTRAINT Kd_Visi;
                            ALTER TABLE Ta_RPJM_Tujuan DROP CONSTRAINT Ta_RPJM_MisiTa_RPJM_Tujuan;
                            ALTER TABLE Ta_RPJM_Tujuan ADD CONSTRAINT Ta_RPJM_MisiTa_RPJM_Tujuan FOREIGN KEY (ID_Misi) REFERENCES Ta_RPJM_Misi(ID_Misi) ON UPDATE CASCADE;
                            ALTER TABLE Ta_RPJM_Sasaran DROP CONSTRAINT Ta_RPJM_TujuanTa_RPJM_Sasaran;
                            ALTER TABLE Ta_RPJM_Sasaran ADD CONSTRAINT Ta_RPJM_TujuanTa_RPJM_Sasaran FOREIGN KEY (ID_Tujuan) REFERENCES Ta_RPJM_Tujuan(ID_Tujuan) ON UPDATE CASCADE;`

const queryAPBDES = `SELECT     A.Tahun, H.Nama_Akun, J.Nama_Bidang, I.Nama_Kegiatan, G.Nama_Kelompok, F.Nama_Jenis, E.Nama_Obyek, SUM(B.Anggaran) AS Anggaran_Uraian, H.Akun, 
                                G.Kelompok, F.Jenis, E.Obyek, D.Nama_Desa, I.Kd_Bid, I.Kd_Keg
                        FROM    (Ta_Bidang J RIGHT OUTER JOIN
                                (Ta_Kegiatan I RIGHT OUTER JOIN
                                ((((Ref_Rek2 G INNER JOIN
                                Ref_Rek1 H ON G.Akun = H.Akun) INNER JOIN
                                Ref_Rek3 F ON G.Kelompok = F.Kelompok) INNER JOIN
                                Ref_Rek4 E ON F.Jenis = E.Jenis) INNER JOIN
                                ((Ta_Desa INNER JOIN
                                Ref_Desa D ON Ta_Desa.Kd_Desa = D.Kd_Desa) INNER JOIN
                                (Ta_RAB A INNER JOIN
                                Ta_RABRinci B ON A.Kd_Rincian = B.Kd_Rincian AND A.Kd_Keg = B.Kd_Keg AND A.Kd_Desa = B.Kd_Desa AND A.Tahun = B.Tahun) ON 
                                Ta_Desa.Tahun = A.Tahun AND Ta_Desa.Kd_Desa = A.Kd_Desa) ON E.Obyek = A.Kd_Rincian) ON I.Kd_Keg = B.Kd_Keg) ON I.Kd_Bid = J.Kd_Bid)
                        WHERE   (H.Akun = '6.') OR
                                    (H.Akun = '4.')
                        GROUP BY A.Tahun, A.Kd_Keg, A.Kd_Rincian, H.Nama_Akun, G.Nama_Kelompok, F.Nama_Jenis, E.Nama_Obyek, F.Jenis, H.Akun, E.Obyek, G.Kelompok, D.Nama_Desa, 
                                    I.Nama_Kegiatan, J.Nama_Bidang, I.Kd_Bid, I.Kd_Keg
                        UNION ALL
                        SELECT  A.Tahun, H.Nama_Akun, J.Nama_Bidang, I.Nama_Kegiatan, G.Nama_Kelompok, F.Nama_Jenis, E.Nama_Obyek, A.Anggaran AS Anggaran_Uraian, H.Akun, 
                                G.Kelompok, F.Jenis, E.Obyek, D.Nama_Desa, I.Kd_Bid, I.Kd_Keg
                        FROM    (((Ref_Rek1 H INNER JOIN
                                Ref_Rek2 G ON H.Akun = G.Akun) INNER JOIN
                                (Ref_Rek3 F INNER JOIN
                                Ref_Rek4 E ON F.Jenis = E.Jenis) ON G.Kelompok = F.Kelompok) INNER JOIN
                                (Ta_Bidang J INNER JOIN
                                (Ref_Desa D INNER JOIN
                                ((Ta_RAB A INNER JOIN
                                Ta_Desa C ON A.Tahun = C.Tahun AND A.Kd_Desa = C.Kd_Desa) INNER JOIN
                                Ta_Kegiatan I ON A.Tahun = I.Tahun AND A.Kd_Keg = I.Kd_Keg) ON D.Kd_Desa = C.Kd_Desa) ON J.Kd_Bid = I.Kd_Bid AND J.Tahun = I.Tahun) ON 
                                E.Obyek = A.Kd_Rincian)
                        ORDER BY A.Tahun, H.Akun, I.Kd_Bid, I.Kd_Keg, F.Jenis, E.Obyek`;              
export class Siskeudes{
    connection: any;
    
    constructor(filename){
        var config = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source='+filename;
        this.connection = ADODB.open(config);         
    }

    get(query,callback){
        this.connection
        .query(query)
        .on('done', function (data) {
            callback(data["records"]);            
        });
    }  

    execute(query,callback){
        this.connection
        .execute(query)
        .on('done', function(data) {
            callback('success')
        })
        .on('fail', function(error) {
            callback('failed')
        });
    }

    getRPJM(idVisi,callback){
        let whereClause = ` WHERE (Ta_RPJM_Visi.ID_Visi = '${idVisi}') ORDER BY Ta_RPJM_Visi.TahunA, Ta_RPJM_Visi.TahunN, Ta_RPJM_Kegiatan.Kd_Keg`;
        this.get(queryRPJM+whereClause,callback);
    } 

    getRenstraRPJM(idVisi ,callback){        
        let whereClause = ` WHERE (Ta_RPJM_Visi.ID_Visi = '${idVisi}')`;
        this.get(queryRenstraRPJM+whereClause,callback);
    }    

    getVisiRPJM(callback){
        this.get(queryVisiRPJM,callback);
    }    

    getRKPByYear(idVisi,rkp,callback){
        let whereClause = ` WHERE (Ta_RPJM_Visi.ID_Visi = '${idVisi}') AND (Ta_RPJM_Kegiatan.Tahun${rkp} = true) 
                            ORDER BY Ta_RPJM_Visi.TahunA, Ta_RPJM_Visi.TahunN, Ta_RPJM_Kegiatan.Kd_Keg`;
        this.get(queryRPJM+whereClause,callback)  
    }  

    getApbdes(callback){
        this.get(queryAPBDES,callback)
    }

    getRAB(year,regionCode,callback){
        console.log(regionCode)
        let whereClause = `  WHERE  (RAB.Tahun = '${year}') AND (Ds.Kd_Desa = '${regionCode}')
                             ORDER BY RAB.Tahun, RAB.Kd_Desa, Rek1.Akun, Bdg.Kd_Bid, Keg.Kd_Keg, Rek3.Jenis, Rek4.Obyek, RABSub.Kd_SubRinci, RABRi.No_Urut;`;
        this.get(queryRAB+whereClause,callback)
    }

    getSumAnggaranRAB(callback){
        this.get(querySumRAB,callback)
    }

    getDetailSPP(noSPP,callback){
        let whereClause = ` WHERE  (S.No_SPP = '${noSPP}')
                             ORDER BY SR.Kd_Rincian,SB.Tgl_Bukti, SB.No_Bukti, SPo.Kd_Rincian;`;
        this.get(queryDetailSPP+whereClause,callback);
    }

    getSPP(callback){
        this.get(querySPP,callback)    
    }
    
    getAllKegiatan(regionCode, callback){
        let whereClause = ` WHERE  (Ds.Kd_Desa = '${regionCode}')`;
        this.get(queryGetAllKegiatan+whereClause,callback)  
    }

    getSisaAnggaranRAB(code,callback){
        let whereClause = ` WHERE  (Ta_RAB.Kd_Keg = '${code}')
                            GROUP BY Ta_RAB.Kd_Keg, Ta_RAB.Kd_Rincian, Ta_SPPRinci.Sumberdana, Ref_Rek4.Obyek, Ref_Rek4.Nama_Obyek, Ta_RAB.Anggaran`;                            
        this.get(querySisaAnggaranRAB+whereClause,callback);
    }

    getRABSub(callback){
        this.get(queryRABSub,callback);
    }

    getKegiatanByCodeRinci(code,callback){
        let whereClause = ` WHERE  (Ta_RABSub.Kd_Rincian = '${code}')`;
        this.get(queryGetKodeKegiatan+whereClause,callback);
    }

    getRefPotongan(callback){
        this.get(queryRefPotongan,callback);
    }

    getRefBidangAndKegiatan(regionCode,callback){
        let whereClause = ` WHERE  (Ta_Desa.Kd_Desa = '${regionCode}')  ORDER BY    Ta_Bidang.Kd_Bid, Ta_Kegiatan.Kd_Keg`;
        this.get(queryGetBidAndKeg+whereClause,callback);
    }

    getRefRekByCode(code,callback){
        let whereClause =`WHERE (Rek1.Akun = '${code}') ORDER BY Rek1.Akun, Rek2.Kelompok, Rek3.Jenis, Rek4.Obyek`;
        this.get(queryGetRefRek+whereClause,callback);
    }

    getRefRekByKelompok(code,callback){
        let whereClause =`WHERE (Rek2.Kelompok = '${code}') ORDER BY Rek1.Akun, Rek2.Kelompok, Rek3.Jenis, Rek4.Obyek`;
        this.get(queryGetRefRek+whereClause,callback);
    }

    getRefSumberDana(callback){
        this.get(queryRefSumberdana,callback)
    }

    applyFixMultipleMisi(callback){
        this.execute(queryFixMultipleMisi,callback);
    }    
}
