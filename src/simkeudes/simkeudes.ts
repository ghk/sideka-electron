/// <reference path="../../app/typings/index.d.ts" />
import * as xlsx from 'xlsx'; 
import * as d3 from 'd3';
import * as ADODB from "node-adodb";

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
        this.get("SELECT * FROM (((Ta_RPJM_Visi INNER JOIN Ta_RPJM_Misi ON Ta_RPJM_Visi.ID_Visi = Ta_RPJM_Misi.ID_Visi) INNER JOIN Ta_RPJM_Tujuan ON Ta_RPJM_Misi.ID_Misi = Ta_RPJM_Tujuan.ID_Misi) INNER JOIN Ta_RPJM_Sasaran ON Ta_RPJM_Tujuan.ID_Tujuan = Ta_RPJM_Sasaran.ID_Tujuan)", callback)
    }
    
    getBidang(callback){
        this.get("SELECT * FROM (((Ta_RPJM_Bidang INNER JOIN Ta_RPJM_Kegiatan ON Ta_RPJM_Bidang.Kd_Bid = Ta_RPJM_Kegiatan.Kd_Bid) INNER JOIN Ta_Anggaran ON Ta_RPJM_Kegiatan.Kd_Keg = Ta_Anggaran.Kd_Keg) INNER JOIN Ta_RPJM_Pagu_Tahunan ON Ta_RPJM_Kegiatan.Kd_Keg = Ta_RPJM_Pagu_Tahunan.Kd_Keg)",callback)
    }

    getRAB(callback){
        this.get("SELECT * FROM (((Ta_RAB INNER JOIN Ta_RPJM_Kegiatan ON Ta_RAB.Kd_Desa = Ta_RPJM_Kegiatan.Kd_Desa) INNER JOIN Ta_RABRinci ON Ta_RAB.Tahun = Ta_RABRinci.Tahun AND Ta_RAB.Kd_Desa = Ta_RABRinci.Kd_Desa AND Ta_RAB.Kd_Keg = Ta_RABRinci.Kd_Keg AND Ta_RAB.Kd_Rincian = Ta_RABRinci.Kd_Rincian) INNER JOIN Ta_RABSub ON Ta_RAB.Tahun = Ta_RABSub.Tahun AND Ta_RAB.Kd_Desa = Ta_RABSub.Kd_Desa AND Ta_RAB.Kd_Keg = Ta_RABSub.Kd_Keg AND Ta_RAB.Kd_Rincian = Ta_RABSub.Kd_Rincian)",callback)
    }
    
    getSPP(callback){
        this.get("SELECT * FROM (((Ta_SPP INNER JOIN Ta_SPPRinci ON Ta_SPP.No_SPP = Ta_SPPRinci.No_SPP) INNER JOIN Ta_RPJM_Kegiatan ON Ta_SPPRinci.Kd_Keg = Ta_RPJM_Kegiatan.Kd_Keg) INNER JOIN Ta_SPPRinci Ta_SPPRinci_1 ON Ta_SPP.No_SPP = Ta_SPPRinci_1.No_SPP)",callback)
    }
}