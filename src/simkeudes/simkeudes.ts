/// <reference path="../../app/typings/index.d.ts" />
import * as xlsx from 'xlsx'; 
import * as d3 from 'd3';
import * as ADODB from "node-adodb";

const queryRPJM = "SELECT   Ta_RPJM_Visi.TahunA, Ta_RPJM_Visi.TahunN, Ta_RPJM_Bidang.Nama_Bidang, Ta_RPJM_Kegiatan.Kd_Desa, Ta_RPJM_Kegiatan.Kd_Bid, \
                            Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Kegiatan.ID_Keg, Ta_RPJM_Kegiatan.Nama_Kegiatan, Ta_RPJM_Kegiatan.Lokasi, Ta_RPJM_Kegiatan.Keluaran, \
                            Ta_RPJM_Kegiatan.Kd_Sas, Ta_RPJM_Kegiatan.Sasaran, Ta_RPJM_Kegiatan.Tahun1, Ta_RPJM_Kegiatan.Tahun2, Ta_RPJM_Kegiatan.Tahun3, \
                            Ta_RPJM_Kegiatan.Tahun4, Ta_RPJM_Kegiatan.Tahun5, Ta_RPJM_Kegiatan.Swakelola, Ta_RPJM_Kegiatan.Kerjasama, Ta_RPJM_Kegiatan.Pihak_Ketiga, \
                            Ta_RPJM_Kegiatan.Sumberdana, SUM(Ta_Anggaran.Anggaran) AS Anggaran_RPJM, Ta_RPJM_Bidang.Kd_Desa AS Expr2 \
                    FROM    (((Ta_RPJM_Bidang INNER JOIN \
                            Ta_RPJM_Kegiatan ON Ta_RPJM_Bidang.Kd_Bid = Ta_RPJM_Kegiatan.Kd_Bid) INNER JOIN \
                            (((Ta_RPJM_Visi INNER JOIN \
                            Ta_RPJM_Misi ON Ta_RPJM_Visi.ID_Visi = Ta_RPJM_Misi.ID_Visi) INNER JOIN \
                            Ta_RPJM_Tujuan ON Ta_RPJM_Misi.ID_Misi = Ta_RPJM_Tujuan.ID_Misi) INNER JOIN \
                            Ta_RPJM_Sasaran ON Ta_RPJM_Sasaran.ID_Tujuan = Ta_RPJM_Tujuan.ID_Tujuan) ON Ta_RPJM_Kegiatan.Kd_Sas = Ta_RPJM_Sasaran.ID_Sasaran) INNER JOIN \
                            Ta_Anggaran ON Ta_RPJM_Kegiatan.Kd_Keg = Ta_Anggaran.Kd_Keg) \
                    WHERE   (Ta_Anggaran.KdPosting = (SELECT MAX(KdPosting) AS KodePosting FROM Ta_AnggaranLog WHERE (Kunci = True) GROUP BY Kd_Desa)) \
                    GROUP BY Ta_RPJM_Visi.TahunA, Ta_RPJM_Visi.TahunN, Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Kegiatan.Kd_Bid, Ta_RPJM_Bidang.Nama_Bidang, \
                            Ta_RPJM_Kegiatan.Kd_Desa, Ta_RPJM_Kegiatan.ID_Keg, Ta_RPJM_Kegiatan.Nama_Kegiatan, Ta_RPJM_Kegiatan.Lokasi, Ta_RPJM_Kegiatan.Keluaran,  \
                            Ta_RPJM_Kegiatan.Kd_Sas, Ta_RPJM_Kegiatan.Sasaran, Ta_RPJM_Kegiatan.Tahun1, Ta_RPJM_Kegiatan.Tahun2, Ta_RPJM_Kegiatan.Tahun3, \
                            Ta_RPJM_Kegiatan.Tahun4, Ta_RPJM_Kegiatan.Tahun5, Ta_RPJM_Kegiatan.Swakelola, Ta_RPJM_Kegiatan.Kerjasama, Ta_RPJM_Kegiatan.Pihak_Ketiga,  \
                            Ta_RPJM_Kegiatan.Sumberdana, Ta_Anggaran.KdPosting, Ta_RPJM_Bidang.Kd_Desa \
                    ORDER BY Ta_RPJM_Visi.TahunA, Ta_RPJM_Visi.TahunN, Ta_RPJM_Kegiatan.Kd_Keg"
              
export class Simkeudes{
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

    getRPJM(callback){
        this.get(queryRPJM,callback)
    }     
}