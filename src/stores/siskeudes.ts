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
const queryPendapatanAndBelanja = `SELECT   A.Tahun, H.Nama_Akun, G.Nama_Kelompok, F.Nama_Jenis, E.Nama_Obyek, SUM(B.Anggaran) AS Anggaran_Uraian, H.Akun, G.Kelompok, F.Jenis, E.Obyek, 
                                            D.Nama_Desa
                                    FROM    ((((Ref_Rek2 G INNER JOIN
                                            Ref_Rek1 H ON G.Akun = H.Akun) INNER JOIN
                                            Ref_Rek3 F ON G.Kelompok = F.Kelompok) INNER JOIN
                                            Ref_Rek4 E ON F.Jenis = E.Jenis) INNER JOIN
                                            ((Ta_Desa INNER JOIN
                                            Ref_Desa D ON Ta_Desa.Kd_Desa = D.Kd_Desa) INNER JOIN
                                            (Ta_RAB A INNER JOIN
                                            Ta_RABRinci B ON A.Kd_Rincian = B.Kd_Rincian AND A.Kd_Keg = B.Kd_Keg AND A.Kd_Desa = B.Kd_Desa AND A.Tahun = B.Tahun) ON 
                                            Ta_Desa.Tahun = A.Tahun AND Ta_Desa.Kd_Desa = A.Kd_Desa) ON E.Obyek = A.Kd_Rincian)
                                    WHERE   (H.Akun = '6.') OR (H.Akun = '4.')
                                    GROUP   BY A.Tahun, A.Kd_Keg, A.Kd_Rincian, H.Nama_Akun, G.Nama_Kelompok, F.Nama_Jenis, E.Nama_Obyek, F.Jenis, H.Akun, E.Obyek, G.Kelompok, D.Nama_Desa
                                    ORDER   BY A.Kd_Rincian`
const queryBelanja = `SELECT    A.Tahun, H.Nama_Akun, J.Nama_Bidang, I.Nama_Kegiatan, F.Nama_Jenis, E.Nama_Obyek, A.Anggaran AS Anggaran_Uraian, A.Kd_Desa, H.NoLap, H.Akun, 
                                J.Kd_Bid, I.Kd_Keg, G.Kelompok, F.Jenis, E.Obyek, D.Nama_Desa, C.Nm_Kades
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
                    ORDER BY    A.Tahun, A.Kd_Desa, H.Akun, J.Kd_Bid, I.Kd_Keg, F.Jenis, E.Obyek`
const queryPembiayaan =``
const queryRAB=``
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
}