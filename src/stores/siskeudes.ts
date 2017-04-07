/// <reference path="../../app/typings/index.d.ts" />
import * as xlsx from 'xlsx'; 
import * as d3 from 'd3';
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
                            Ta_RPJM_Bidang ON Ta_RPJM_Kegiatan.Kd_Bid = Ta_RPJM_Bidang.Kd_Bid) ON Ta_RPJM_Pagu_Tahunan.Kd_Keg = Ta_RPJM_Kegiatan.Kd_Keg)`

const queryRenstraRPJM = `SELECT    Ta_RPJM_Visi.Uraian_Visi, Ta_RPJM_Misi.Uraian_Misi, Ta_RPJM_Tujuan.Uraian_Tujuan, Ta_RPJM_Visi.TahunA, Ta_RPJM_Visi.TahunN, 
                                    Ta_RPJM_Sasaran.Uraian_Sasaran, Ta_RPJM_Visi.ID_Visi
                            FROM    (((Ta_RPJM_Visi INNER JOIN
                                    Ta_RPJM_Misi ON Ta_RPJM_Visi.ID_Visi = Ta_RPJM_Misi.ID_Visi) INNER JOIN
                                    Ta_RPJM_Tujuan ON Ta_RPJM_Misi.ID_Misi = Ta_RPJM_Tujuan.ID_Misi) INNER JOIN
                                    Ta_RPJM_Sasaran ON Ta_RPJM_Tujuan.ID_Tujuan = Ta_RPJM_Sasaran.ID_Tujuan) `
const queryVisiRPJM = `SELECT   Ta_RPJM_Visi.*
                        FROM    (Ta_Desa INNER JOIN Ta_RPJM_Visi ON Ta_Desa.Kd_Desa = Ta_RPJM_Visi.Kd_Desa)`
const queryAPBDES = `SELECT        A.Tahun, H.Nama_Akun, J.Nama_Bidang, I.Nama_Kegiatan, G.Nama_Kelompok, F.Nama_Jenis, E.Nama_Obyek, SUM(B.Anggaran) AS Anggaran_Uraian, H.Akun, 
                                    G.Kelompok, F.Jenis, E.Obyek, D.Nama_Desa, I.Kd_Bid, I.Kd_Keg
                        FROM            (Ta_Bidang J RIGHT OUTER JOIN
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
                        WHERE        (H.Akun = '6.') OR
                                    (H.Akun = '4.')
                        GROUP BY A.Tahun, A.Kd_Keg, A.Kd_Rincian, H.Nama_Akun, G.Nama_Kelompok, F.Nama_Jenis, E.Nama_Obyek, F.Jenis, H.Akun, E.Obyek, G.Kelompok, D.Nama_Desa, 
                                    I.Nama_Kegiatan, J.Nama_Bidang, I.Kd_Bid, I.Kd_Keg
                        UNION ALL
                        SELECT        A.Tahun, H.Nama_Akun, J.Nama_Bidang, I.Nama_Kegiatan, G.Nama_Kelompok, F.Nama_Jenis, E.Nama_Obyek, A.Anggaran AS Anggaran_Uraian, H.Akun, 
                                    G.Kelompok, F.Jenis, E.Obyek, D.Nama_Desa, I.Kd_Bid, I.Kd_Keg
                        FROM        (((Ref_Rek1 H INNER JOIN
                                    Ref_Rek2 G ON H.Akun = G.Akun) INNER JOIN
                                    (Ref_Rek3 F INNER JOIN
                                    Ref_Rek4 E ON F.Jenis = E.Jenis) ON G.Kelompok = F.Kelompok) INNER JOIN
                                    (Ta_Bidang J INNER JOIN
                                    (Ref_Desa D INNER JOIN
                                    ((Ta_RAB A INNER JOIN
                                    Ta_Desa C ON A.Tahun = C.Tahun AND A.Kd_Desa = C.Kd_Desa) INNER JOIN
                                    Ta_Kegiatan I ON A.Tahun = I.Tahun AND A.Kd_Keg = I.Kd_Keg) ON D.Kd_Desa = C.Kd_Desa) ON J.Kd_Bid = I.Kd_Bid AND J.Tahun = I.Tahun) ON 
                                    E.Obyek = A.Kd_Rincian)
                        ORDER BY A.Tahun, H.Akun, I.Kd_Bid, I.Kd_Keg, F.Jenis, E.Obyek`
const queryRAB=`SELECT      A.Tahun, H.Nama_Akun, J.Nama_Bidang, I.Nama_Kegiatan, G.Nama_Kelompok, F.Nama_Jenis, E.Nama_Obyek, B.Uraian, B.JmlSatuan, B.Satuan, B.HrgSatuan, 
                            B.Anggaran, B.SumberDana, B.No_Urut, G.Kelompok, F.Jenis, E.Obyek, D.Nama_Desa, I.Kd_Bid, I.Kd_Keg
                    FROM    ((Ta_Kegiatan I RIGHT OUTER JOIN
                            (Ta_RABRinci B INNER JOIN
                            ((((Ref_Rek2 G INNER JOIN
                            Ref_Rek1 H ON G.Akun = H.Akun) INNER JOIN
                            Ref_Rek3 F ON G.Kelompok = F.Kelompok) INNER JOIN
                            Ref_Rek4 E ON F.Jenis = E.Jenis) INNER JOIN
                            ((Ta_Desa K INNER JOIN
                            Ref_Desa D ON K.Kd_Desa = D.Kd_Desa) INNER JOIN
                            Ta_RAB A ON K.Tahun = A.Tahun AND K.Kd_Desa = A.Kd_Desa) ON E.Obyek = A.Kd_Rincian) ON B.Tahun = A.Tahun AND B.Kd_Desa = A.Kd_Desa AND 
                            B.Kd_Keg = A.Kd_Keg AND B.Kd_Rincian = A.Kd_Rincian) ON I.Kd_Keg = B.Kd_Keg) LEFT OUTER JOIN
                            Ta_Bidang J ON I.Kd_Bid = J.Kd_Bid)
                    ORDER BY A.Tahun, H.Akun, I.Kd_Bid, I.Kd_Keg, F.Jenis, E.Obyek, B.No_Urut`
const querySPP=''

              
export class Siskeudes{
    connection: any;
    
    constructor(filename){
        var config = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source='+filename;
        this.connection = ADODB.open(config);         
    }
    get(query,callback){
        this.connection.query(query)
        .on('done', function (data) {
            callback(data["records"]);            
        });
    }  

    getRPJM(idVisi,callback){
        let whereClause = ` WHERE (Ta_RPJM_Visi.ID_Visi = '${idVisi}')`
        let orderClause = ` ORDER BY Ta_RPJM_Visi.TahunA, Ta_RPJM_Visi.TahunN, Ta_RPJM_Kegiatan.Kd_Keg`
        this.get(queryRPJM+whereClause+orderClause,callback)
    } 

    getRenstraRPJM(idVisi ,callback){        
        let whereClause = ` WHERE (Ta_RPJM_Visi.ID_Visi = '${idVisi}')`
        this.get(queryRenstraRPJM+whereClause,callback)
    }    

    getVisiRPJM(callback){
        this.get(queryVisiRPJM,callback)
    }    

    getRKPByYear(idVisi,rkp,callback){
        let whereClause = ` WHERE (Ta_RPJM_Visi.ID_Visi = '${idVisi}') AND (Ta_RPJM_Kegiatan.Tahun${rkp} = true)`
        var orderClause = ` ORDER BY Ta_RPJM_Visi.TahunA, Ta_RPJM_Visi.TahunN, Ta_RPJM_Kegiatan.Kd_Keg`
        this.get(queryRPJM+whereClause+orderClause,callback)  
    }  
    getApbdes(callback){
        this.get(queryAPBDES,callback)
    }
    getRAB(callback){
        this.get(queryRAB,callback)
    }
}