import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';

import * as jetpack from 'fs-jetpack';
import * as xlsx from 'xlsx';
import * as os from "os";
import * as moment from 'moment';

import Models from '../schemas/siskeudesModel';
import SettingsService from '../stores/settingsService';
import {FIELD_ALIASES, fromSiskeudes, toSiskeudes} from './siskeudesFieldTransformer';

let ADODB = null;
if(os.platform() == "win32"){
	ADODB = require('node-adodb');
} else {
	ADODB = {};
}

const queryVisiRPJM = `SELECT   Ta_RPJM_Visi.*
                        FROM    (Ta_Desa INNER JOIN Ta_RPJM_Visi ON Ta_Desa.Kd_Desa = Ta_RPJM_Visi.Kd_Desa)`;

const queryRenstraRPJM = `SELECT    Ta_RPJM_Visi.ID_Visi, Ta_RPJM_Misi.ID_Misi, Ta_RPJM_Tujuan.ID_Tujuan, Ta_RPJM_Sasaran.ID_Sasaran, Ta_RPJM_Visi.Uraian_Visi, Ta_RPJM_Misi.Uraian_Misi, Ta_RPJM_Tujuan.Uraian_Tujuan, 
                                    Ta_RPJM_Sasaran.Uraian_Sasaran
                            FROM    ((((Ta_Desa INNER JOIN
                                    Ta_RPJM_Visi ON Ta_Desa.Kd_Desa = Ta_RPJM_Visi.Kd_Desa) LEFT OUTER JOIN
                                    Ta_RPJM_Misi ON Ta_RPJM_Visi.ID_Visi = Ta_RPJM_Misi.ID_Visi) LEFT OUTER JOIN
                                    Ta_RPJM_Tujuan ON Ta_RPJM_Misi.ID_Misi = Ta_RPJM_Tujuan.ID_Misi) LEFT OUTER JOIN
                                    Ta_RPJM_Sasaran ON Ta_RPJM_Tujuan.ID_Tujuan = Ta_RPJM_Sasaran.ID_Tujuan)`;

const queryRPJM = `SELECT       Ta_RPJM_Bidang.Nama_Bidang, Ta_RPJM_Kegiatan.Kd_Desa, Ta_RPJM_Kegiatan.Kd_Bid, Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Kegiatan.ID_Keg, Ta_RPJM_Kegiatan.Nama_Kegiatan, Ta_RPJM_Kegiatan.Lokasi, 
                                Ta_RPJM_Kegiatan.Keluaran, Ta_RPJM_Kegiatan.Kd_Sas, Ta_RPJM_Kegiatan.Sasaran, Ta_RPJM_Kegiatan.Tahun1, Ta_RPJM_Kegiatan.Tahun2, Ta_RPJM_Kegiatan.Tahun3, Ta_RPJM_Kegiatan.Tahun4, 
                                Ta_RPJM_Kegiatan.Tahun5, Ta_RPJM_Kegiatan.Swakelola, Ta_RPJM_Kegiatan.Kerjasama, Ta_RPJM_Kegiatan.Pihak_Ketiga, Ta_RPJM_Kegiatan.Sumberdana, Ta_RPJM_Kegiatan.Tahun6, 
                                Ta_RPJM_Sasaran.Uraian_Sasaran
                    FROM        ((Ta_RPJM_Bidang INNER JOIN
                                Ta_RPJM_Kegiatan ON Ta_RPJM_Bidang.Kd_Bid = Ta_RPJM_Kegiatan.Kd_Bid) LEFT OUTER JOIN
                                Ta_RPJM_Sasaran ON Ta_RPJM_Kegiatan.Kd_Sas = Ta_RPJM_Sasaran.ID_Sasaran)`;

const queryPaguTahunan = `SELECT    Bid.Kd_Bid, Bid.Nama_Bidang, Keg.Nama_Kegiatan, Pagu.Kd_Desa, Pagu.Kd_Keg, Pagu.Kd_Tahun, Pagu.Kd_Sumber, Pagu.Biaya, Pagu.Volume, Pagu.Satuan, Pagu.Lokasi_Spesifik, Pagu.Jml_Sas_Pria, 
                                    Pagu.Jml_Sas_Wanita, Pagu.Jml_Sas_ARTM, Pagu.Waktu, Format(Pagu.Mulai, 'dd/mm/yyyy') AS Mulai, Format(Pagu.Selesai, 'Short Date') AS Selesai, Pagu.Pola_Kegiatan, Pagu.Pelaksana
                            FROM    ((Ta_RPJM_Pagu_Tahunan Pagu INNER JOIN
                                    Ta_RPJM_Kegiatan Keg ON Pagu.Kd_Keg = Keg.Kd_Keg) INNER JOIN
                                    Ta_RPJM_Bidang Bid ON Keg.Kd_Bid = Bid.Kd_Bid)`;

const queryRPJMBidAndKeg = `SELECT  Ta_RPJM_Bidang.Kd_Bid, Ta_RPJM_Bidang.Nama_Bidang, Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Kegiatan.Nama_Kegiatan
                            FROM    (Ta_RPJM_Bidang INNER JOIN Ta_RPJM_Kegiatan ON Ta_RPJM_Bidang.Kd_Bid = Ta_RPJM_Kegiatan.Kd_Bid)`

const queryPdptAndPby = `SELECT    Rek1.Akun, Rek1.Nama_Akun, Rek2.Kelompok, Rek2.Nama_Kelompok, Rek3.Jenis, Rek3.Nama_Jenis, Rek4.Obyek, Rek4.Nama_Obyek, Bdg.Kd_Bid, Bdg.Nama_Bidang, Keg.Kd_Keg, Keg.Nama_Kegiatan, 
                                    RABSub.Kd_SubRinci, RABSub.Nama_SubRinci, RAB.Kd_Rincian, RABRi.Uraian, RABRi.SumberDana, RABRi.Satuan, RABRi.JmlSatuan, RAB.Kd_Desa, RABRi.HrgSatuan, RABRi.Anggaran, RABRi.JmlSatuanPAK, 
                                    RABRi.HrgSatuanPAK, RABRi.AnggaranStlhPAK, RABRi.AnggaranPAK, RABRi.Kode_SBU, [Rek4.Obyek] & [RABSub.Kd_SubRinci] AS Kode_SubRinci, IIF(Rek3.Jenis = '5.1.3.', [Kode_SubRinci] &  '.', Rek4.Obyek) & [RABRi.No_Urut] AS Kode_Rincian, Rek4.Obyek & [RABRi.No_Urut] AS Obyek_Rincian, RABRi.No_Urut
                            FROM    ((((((Ref_Desa RefDs INNER JOIN
                                    (Ta_RAB RAB INNER JOIN
                                    Ta_Desa Ds ON RAB.Kd_Desa = Ds.Kd_Desa AND RAB.Tahun = Ds.Tahun) ON RefDs.Kd_Desa = Ds.Kd_Desa) LEFT OUTER JOIN
                                    Ta_RABRinci RABRi ON RAB.Tahun = RABRi.Tahun AND RAB.Kd_Desa = RABRi.Kd_Desa AND RAB.Kd_Keg = RABRi.Kd_Keg AND RAB.Kd_Rincian = RABRi.Kd_Rincian) LEFT OUTER JOIN
                                    (Ref_Rek1 Rek1 RIGHT OUTER JOIN
                                    (Ref_Rek2 Rek2 RIGHT OUTER JOIN
                                    (Ref_Rek4 Rek4 LEFT OUTER JOIN
                                    Ref_Rek3 Rek3 ON Rek4.Jenis = Rek3.Jenis) ON Rek2.Kelompok = Rek3.Kelompok) ON Rek1.Akun = Rek2.Akun) ON RAB.Kd_Rincian = Rek4.Obyek) LEFT OUTER JOIN
                                    Ta_Kegiatan Keg ON RAB.Kd_Keg = Keg.Kd_Keg AND RAB.Kd_Desa = Keg.Kd_Desa AND RAB.Tahun = Keg.Tahun) LEFT OUTER JOIN
                                    Ta_Bidang Bdg ON Keg.Kd_Bid = Bdg.Kd_Bid AND Keg.Kd_Desa = Bdg.Kd_Desa) LEFT OUTER JOIN
                                    Ta_RABSub RABSub ON RAB.Tahun = RABSub.Tahun AND RAB.Kd_Desa = RABSub.Kd_Desa AND RAB.Kd_Keg = RABSub.Kd_Keg AND RAB.Kd_Rincian = RABSub.Kd_Rincian) `

const queryBelanja = `  SELECT  Rek1.Akun, Rek1.Nama_Akun, Rek2.Kelompok, Rek2.Nama_Kelompok, Rek3.Jenis, Rek3.Nama_Jenis, Rek4.Obyek, Rek4.Nama_Obyek, Bdg.Kd_Bid, Bdg.Nama_Bidang, Keg.Kd_Keg, Keg.Nama_Kegiatan, 
                                RABSub.Kd_SubRinci, RABSub.Nama_SubRinci, RAB.Kd_Rincian, RABRi.Uraian, RABRi.SumberDana, RABRi.Satuan, RABRi.JmlSatuan, RAB.Kd_Desa, RABRi.HrgSatuan, RABRi.Anggaran, RABRi.JmlSatuanPAK, 
                                RABRi.HrgSatuanPAK, RABRi.AnggaranStlhPAK, RABRi.AnggaranPAK, RABRi.Kode_SBU, [Rek4.Obyek] & [RABSub.Kd_SubRinci] AS Kode_SubRinci, IIF(Rek3.Jenis = '5.1.3.', [Kode_SubRinci] &  '.', Rek4.Obyek) & [RABRi.No_Urut] AS Kode_Rincian, Rek4.Obyek & [RABRi.No_Urut] AS Obyek_Rincian, RABRi.No_Urut
                        FROM            (Ta_Bidang Bdg RIGHT OUTER JOIN
                         ((((Ref_Desa RefDs INNER JOIN
                         (Ta_RAB RAB INNER JOIN
                         Ta_Desa Ds ON RAB.Kd_Desa = Ds.Kd_Desa AND RAB.Tahun = Ds.Tahun) ON RefDs.Kd_Desa = Ds.Kd_Desa) LEFT OUTER JOIN
                         (Ta_RABRinci RABRi RIGHT OUTER JOIN
                         Ta_RABSub RABSub ON RABRi.Tahun = RABSub.Tahun AND RABRi.Kd_Desa = RABSub.Kd_Desa AND RABRi.Kd_Keg = RABSub.Kd_Keg AND RABRi.Kd_Rincian = RABSub.Kd_Rincian AND 
                         RABRi.Kd_SubRinci = RABSub.Kd_SubRinci) ON RAB.Tahun = RABSub.Tahun AND RAB.Kd_Desa = RABSub.Kd_Desa AND RAB.Kd_Keg = RABSub.Kd_Keg AND RAB.Kd_Rincian = RABSub.Kd_Rincian) LEFT OUTER JOIN
                         (Ref_Rek1 Rek1 RIGHT OUTER JOIN
                         (Ref_Rek2 Rek2 RIGHT OUTER JOIN
                         (Ref_Rek4 Rek4 LEFT OUTER JOIN
                         Ref_Rek3 Rek3 ON Rek4.Jenis = Rek3.Jenis) ON Rek2.Kelompok = Rek3.Kelompok) ON Rek1.Akun = Rek2.Akun) ON RAB.Kd_Rincian = Rek4.Obyek) LEFT OUTER JOIN
                         Ta_Kegiatan Keg ON RAB.Kd_Keg = Keg.Kd_Keg AND RAB.Kd_Desa = Keg.Kd_Desa AND RAB.Tahun = Keg.Tahun) ON Bdg.Kd_Bid = Keg.Kd_Bid AND Bdg.Kd_Desa = Keg.Kd_Desa)`

const querySumRAB = `SELECT  RAB.Tahun, Rek1.Nama_Akun, SUM(RABRi.Anggaran) AS Anggaran, Rek2.Akun, Ds.Kd_Desa
                    FROM    ((((Ref_Rek2 Rek2 INNER JOIN
                            Ref_Rek1 Rek1 ON Rek2.Akun = Rek1.Akun) INNER JOIN
                            Ref_Rek3 Rek3 ON Rek2.Kelompok = Rek3.Kelompok) INNER JOIN
                            Ref_Rek4 Rek4 ON Rek3.Jenis = Rek4.Jenis) INNER JOIN
                            (Ta_Desa Ds INNER JOIN
                            (Ta_RAB RAB LEFT OUTER JOIN
                            Ta_RABRinci RABRi ON RAB.Kd_Rincian = RABRi.Kd_Rincian AND RAB.Kd_Keg = RABRi.Kd_Keg AND RAB.Kd_Desa = RABRi.Kd_Desa AND RAB.Tahun = RABRi.Tahun) ON Ds.Tahun = RAB.Tahun AND 
                            Ds.Kd_Desa = RAB.Kd_Desa) ON Rek4.Obyek = RAB.Kd_Rincian) `;

const queryGetAllKegiatan = `SELECT Keg.* FROM Ta_Kegiatan Keg`;

const queryTaKegiatan =  `SELECT    Bid.Tahun, Bid.Kd_Desa, Bid.Kd_Bid, Bid.Nama_Bidang, Keg.Kd_Keg, Keg.ID_Keg, Keg.Nama_Kegiatan, Keg.Pagu, Keg.Pagu_PAK, Keg.Nm_PPTKD, Keg.NIP_PPTKD, Keg.Lokasi, Keg.Waktu, Keg.Keluaran, Keg.Sumberdana
                            FROM    (Ta_Bidang Bid INNER JOIN
                            Ta_Kegiatan Keg ON Bid.Tahun = Keg.Tahun AND Bid.Kd_Bid = Keg.Kd_Bid) `

const queryGetBidAndKeg = `SELECT   Ta_Bidang.Kd_Bid, Ta_Bidang.Nama_Bidang, Ta_Kegiatan.Kd_Keg, Ta_Kegiatan.Nama_Kegiatan, Ta_Kegiatan.Pagu

                            FROM    ((Ta_Bidang INNER JOIN
                                    Ta_Kegiatan ON Ta_Bidang.Tahun = Ta_Kegiatan.Tahun AND Ta_Bidang.Kd_Bid = Ta_Kegiatan.Kd_Bid) INNER JOIN
                                    Ta_Desa ON Ta_Bidang.Tahun = Ta_Desa.Tahun AND Ta_Bidang.Kd_Desa = Ta_Desa.Kd_Desa)`;

const querySumberdanaPaguTahunan = `SELECT  DISTINCT Ta_RPJM_Kegiatan.Kd_Bid, Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Pagu_Tahunan.Kd_Sumber
                                    FROM    (Ta_RPJM_Kegiatan INNER JOIN
                                            Ta_RPJM_Pagu_Tahunan ON Ta_RPJM_Kegiatan.Kd_Keg = Ta_RPJM_Pagu_Tahunan.Kd_Keg) `;

const querySPP = `SELECT    Ta_SPP.No_SPP, Format(Ta_SPP.Tgl_SPP, 'dd/mm/yyyy') AS Tgl_SPP, Ta_SPP.Jn_SPP, Ta_SPP.Keterangan, Ta_SPP.Jumlah, Ta_SPP.Potongan, Ta_SPP.Tahun, Ta_SPP.Kd_Desa, Ta_SPP.Status
                  FROM      Ta_SPP`;

const querySPPRinci = `SELECT Kd_Rincian, No_SPP, Kd_Desa, Tahun, Kd_Keg, Sumberdana, Nilai FROM Ta_SPPRinci`;

const querySPPBukti = `SELECT No_Bukti, Kd_Rincian, No_SPP, Kd_Desa, Tahun, Kd_Keg, Sumberdana, Format(Tgl_Bukti, 'dd/mm/yyyy') AS Tgl_Bukti, Nm_Penerima,
                                Alamat, Rek_Bank, Nm_Bank, NPWP, Keterangan, Nilai FROM Ta_SPPBukti`;

const queryTBP = `SELECT   Tahun, Kd_Desa, No_Bukti, Format(Tgl_Bukti, 'dd/mm/yyyy') AS Tgl_Bukti, Uraian, Nm_Penyetor, Alamat_Penyetor,
                            TTD_Penyetor, NoRek_Bank, Nama_Bank, Jumlah, Nm_Bendahara, Jbt_Bendahara, Status,
                            KdBayar, Ref_Bayar
                  FROM      Ta_TBP`;

const queryTBPRinci = `SELECT   Ta_TBPRinci.*, Ref_Rek4.Nama_Obyek
                        FROM    (Ta_TBPRinci INNER JOIN Ref_Rek4 ON Ta_TBPRinci.Kd_Rincian = Ref_Rek4.Obyek)`;


const queryDetailSPP = `SELECT      S.Keterangan, SB.Keterangan AS Keterangan_Bukti, SR.Sumberdana, SR.Nilai, S.No_SPP, SR.Kd_Rincian, SB.Nm_Penerima, Format(SB.Tgl_Bukti, 'dd/mm/yyyy') AS Tgl_Bukti, SB.Rek_Bank, SB.Nm_Bank, SB.NPWP, 
                                    SB.Nilai AS Nilai_SPP_Bukti, SB.No_Bukti, SB.Alamat, SR.Kd_Keg, SPo.Nilai AS Nilai_SPPPot, Format(S.Tgl_SPP, 'dd/mm/yyyy') AS Tgl_SPP, SPo.Kd_Rincian AS Kd_Potongan, Rek4.Nama_Obyek, SR.Kd_Rincian AS KdRinci, 
                                    SB.No_Bukti AS NoBukti
                        FROM        ((((Ta_SPPRinci SR INNER JOIN  Ta_SPP S ON SR.No_SPP = S.No_SPP) INNER JOIN
                                    Ref_Rek4 Rek4 ON SR.Kd_Rincian = Rek4.Obyek) LEFT OUTER JOIN
                                    Ta_SPPBukti SB ON SR.No_SPP = SB.No_SPP AND SR.Kd_Keg = SB.Kd_Keg AND SR.Kd_Rincian = SB.Kd_Rincian AND SR.Sumberdana = SB.Sumberdana) LEFT OUTER JOIN
                                    Ta_SPPPot SPo ON SB.No_Bukti = SPo.No_Bukti)`;

const queryRABSub = `SELECT     Ta_RAB.Kd_Rincian, Ta_RABSub.Nama_SubRinci, Ta_RAB.Anggaran, Ta_RABRinci.SumberDana AS Sumberdana
                     FROM       ((Ta_RAB INNER JOIN
                                Ta_RABSub ON Ta_RAB.Tahun = Ta_RABSub.Tahun AND Ta_RAB.Kd_Desa = Ta_RABSub.Kd_Desa AND Ta_RAB.Kd_Keg = Ta_RABSub.Kd_Keg AND Ta_RAB.Kd_Rincian = Ta_RABSub.Kd_Rincian) INNER JOIN
                                Ta_RABRinci ON Ta_RABSub.Tahun = Ta_RABRinci.Tahun AND Ta_RABSub.Kd_Desa = Ta_RABRinci.Kd_Desa AND Ta_RABSub.Kd_Keg = Ta_RABRinci.Kd_Keg AND Ta_RABSub.Kd_Rincian = Ta_RABRinci.Kd_Rincian AND 
                                Ta_RABSub.Kd_SubRinci = Ta_RABRinci.Kd_SubRinci)`;

const querySisaAnggaranRAB = `SELECT    Ta_Anggaran.Tahun, Ta_Anggaran.Kd_Keg, Ta_Anggaran.Kd_Rincian, Ref_Rek4.Nama_Obyek, Ta_Anggaran.SumberDana As Sumberdana, Ta_Anggaran.Anggaran, IIF(SUM(Ta_SPPRinci.Nilai) is Null ,0,SUM(Ta_SPPRinci.Nilai)) AS Terpakai, [Ta_Anggaran.Anggaran] - [Terpakai] AS Sisa
                                FROM    (((Ta_Anggaran INNER JOIN
                                        Ta_Kegiatan ON Ta_Anggaran.Tahun = Ta_Kegiatan.Tahun AND Ta_Anggaran.Kd_Keg = Ta_Kegiatan.Kd_Keg) INNER JOIN
                                        Ref_Rek4 ON Ta_Anggaran.Kd_Rincian = Ref_Rek4.Obyek) LEFT OUTER JOIN
                                        Ta_SPPRinci ON Ta_Anggaran.Kd_Rincian = Ta_SPPRinci.Kd_Rincian AND Ta_Anggaran.Kd_Keg = Ta_SPPRinci.Kd_Keg)`;

const queryGetKodeKegiatan = `SELECT    Ta_RPJM_Kegiatan.Kd_Keg, Ta_RPJM_Kegiatan.Nama_Kegiatan, Ta_RPJM_Kegiatan.Sumberdana
                              FROM      ((Ta_Desa INNER JOIN
                                        Ta_RABSub ON Ta_Desa.Kd_Desa = Ta_RABSub.Kd_Desa) LEFT OUTER JOIN
                                        Ta_RPJM_Kegiatan ON Ta_RABSub.Kd_Keg = Ta_RPJM_Kegiatan.Kd_Keg) `;

const queryRefPotongan = `SELECT    Ref_Potongan.*, Ref_Rek4.*
                          FROM      (Ref_Potongan INNER JOIN Ref_Rek4 ON Ref_Potongan.Kd_Rincian = Ref_Rek4.Obyek)`;

const queryGetRefRek = `SELECT      Rek1.Akun, Rek1.Nama_Akun, Rek2.Kelompok, Rek2.Nama_Kelompok, Rek3.Jenis, Rek3.Nama_Jenis, Rek4.Obyek, Rek4.Nama_Obyek
                        FROM        (((Ref_Rek1 Rek1 INNER JOIN
                                    Ref_Rek2 Rek2 ON Rek1.Akun = Rek2.Akun) INNER JOIN
                                    Ref_Rek3 Rek3 ON Rek2.Kelompok = Rek3.Kelompok) INNER JOIN
                                    Ref_Rek4 Rek4 ON Rek3.Jenis = Rek4.Jenis) `;

const queryRefSumberdana = `SELECT  Kode, Nama_Sumber, Urut
                            FROM    Ref_Sumber
                            ORDER BY Urut`;

const queryGetMaxNoSPP =  `SELECT MAX(No_SPP) AS [no] FROM  Ta_SPP`;

const queryGetMaxNoBukti = `SELECT MAX(No_Bukti) AS [no] FROM  Ta_SPPBukti`;

const queryGetMaxNoTBP =  `SELECT MAX(No_Bukti) AS No_Bukti   FROM Ta_TBP`;

const queryGetMaxSTS = 'SELECT  MAX(No_Bukti) AS No_Bukti FROM  Ta_STS';

const queryRefBidang = `SELECT Ref_Bidang.* FROM Ref_Bidang`;

const queryRefKegiatan = `SELECT Ref_Kegiatan.* FROM Ref_Kegiatan`;

const queryTaBidang = `SELECT Tahun, Kd_Desa, Kd_Bid, Nama_Bidang FROM Ta_Bidang Bid `;

const queryRpjmBidang = `SELECT Ta_RPJM_Bidang.* FROM   Ta_RPJM_Bidang`;

const queryTaDesa = `SELECT Ref_Kecamatan.Kd_Kec, Ref_Kecamatan.Nama_Kecamatan, Ref_Desa.Nama_Desa, Ta_Desa.*
                        FROM    ((Ta_Desa INNER JOIN
                                    Ref_Desa ON Ta_Desa.Kd_Desa = Ref_Desa.Kd_Desa) INNER JOIN
                                    Ref_Kecamatan ON Ref_Desa.Kd_Kec = Ref_Kecamatan.Kd_Kec)`;
const queryTaPemda = `SELECT Kd_Prov, Nama_Pemda, Nama_Provinsi, Ibukota, Alamat, Nm_Bupati, Jbt_Bupati FROM Ta_Pemda`;

const queryAnggaranLog = `SELECT    Ta_AnggaranLog.KdPosting, Ta_AnggaranLog.Tahun, Ta_AnggaranLog.Kd_Desa, Ta_AnggaranLog.No_Perdes, Format(Ta_AnggaranLog.TglPosting, 'dd/mm/yyyy') AS TglPosting , Ta_AnggaranLog.UserID, Ta_AnggaranLog.Kunci, Ref_Desa.Nama_Desa
                            FROM    (Ta_AnggaranLog INNER JOIN  Ref_Desa ON Ta_AnggaranLog.Kd_Desa = Ref_Desa.Kd_Desa) `;

const queryPencairanSPP =  `SELECT  Tahun, No_Cek, No_SPP, Tgl_Cek, Kd_Desa, Keterangan, Jumlah, Potongan, KdBayar FROM Ta_Pencairan`;

                           
const querySts = `SELECT Tahun, No_Bukti, Tgl_Bukti, Kd_Desa, Uraian, NoRek_Bank, Nama_Bank, Jumlah, Nm_Bendahara, Jbt_Bendahara
                            FROM    Ta_STS`;

const queryRincianTBP = `SELECT     A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, A.SumberDana, SUM(A.Anggaran) + SUM(A.AnggaranPAK) AS Nilai, B.Nama_Obyek
                        FROM        (Ta_RABRinci A INNER JOIN  Ref_Rek4 B ON A.Kd_Rincian = B.Obyek)
                        GROUP BY A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, A.SumberDana, B.Nama_Obyek`;
                        
const queryFixMultipleMisi = `  ALTER TABLE Ta_RPJM_Tujuan DROP CONSTRAINT Kd_Visi;
                                ALTER TABLE Ta_RPJM_Sasaran DROP CONSTRAINT Kd_Visi;
                                ALTER TABLE Ta_RPJM_Tujuan DROP CONSTRAINT Ta_RPJM_MisiTa_RPJM_Tujuan;
                                ALTER TABLE Ta_RPJM_Tujuan ADD CONSTRAINT Ta_RPJM_MisiTa_RPJM_Tujuan FOREIGN KEY (ID_Misi) REFERENCES Ta_RPJM_Misi(ID_Misi) ON UPDATE CASCADE;
                                ALTER TABLE Ta_RPJM_Sasaran DROP CONSTRAINT Ta_RPJM_TujuanTa_RPJM_Sasaran;
                                ALTER TABLE Ta_RPJM_Sasaran ADD CONSTRAINT Ta_RPJM_TujuanTa_RPJM_Sasaran FOREIGN KEY (ID_Tujuan) REFERENCES Ta_RPJM_Tujuan(ID_Tujuan) ON UPDATE CASCADE;`

@Injectable()
export default class SiskeudesService {
    private connection: any;
    private connectionString: string;
    private siskeudesPath: string;
    private kodeDesa: string;
    private settingsSubscription: Subscription;

    constructor(
        private settingsService: SettingsService
    ) {
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
            this.siskeudesPath = settings['siskeudes.path'];
            this.kodeDesa = settings['siskeudes.desaCode'];
            this.connectionString = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + this.siskeudesPath;
            this.connection = ADODB.open(this.connectionString);
        })        
    }

    isSiskeudesDbExist(): boolean {
        if (!jetpack.exists(this.siskeudesPath))
            return false;
        return true;
    }

    getSiskeudesMessage(): string {
        let message = '';

        if (!this.siskeudesPath) {
            message = "Harap Pilih Database SISKEUDES";
        } else if (!this.isSiskeudesDbExist()) {
            message = `Database Tidak Ditemukan di lokasi: ${this.siskeudesPath}`;
        } else if (this.kodeDesa === '' || !this.kodeDesa) {
            message = "Harap Pilih Desa";                
        }
        
        return message;
    }

    get(query, callback) {
        this.connection
            .query(query)
            .on('done', function (data) {
                callback(data);
            })
            .on('fail', function (error) {
                callback(error);
            });
    }  

    query(query): Promise<any> {
        return new Promise((resolve, reject) => {
            this.connection.query(query)
              .on('done', resolve)
              .on('fail', reject);
          });
    }

    execute(query, callback) {
        this.connection
            .execute(query)
            .on('done', function (data) {
                callback(data)
            })
            .on('fail', function (error) {
                callback(error);
            });
    }

    getWithTransaction(query, callback) {
        this.connection
            .queryWithTransaction(query)
            .on('done', function (data) {
                callback(data);
            })
            .on('fail', function (error) {
                callback(error);
            });
    }

    executeWithTransaction(query, callback) {
        this.connection
            .executeWithTransaction(query)
            .on('done', function (data) {
                callback(data)
            })
            .on('fail', function (error) {
                callback(error);
            });
    }

    bulkExecuteWithTransaction(query, callback) {
        this.connection
            .bulkExecuteWithTransaction(query)
            .on('done', function (data) {
                callback(data)
            })
            .on('fail', function (error) {
                callback(error);
            });
    }

    saveToSiskeudesDB(bundleData, type, callback: any): void {
        let me = this;
        let queries = [];

        bundleData.insert.forEach(c => {
            let table = Object.keys(c)[0];
            let query = me.createQueryInsert(table, c[table]);
            queries.push(query);
        });

        bundleData.update.forEach(c => {
            let table = Object.keys(c)[0];
            let query = me.createQueryUpdate(table, c[table]);
            queries.push(query);
        });

        bundleData.delete.forEach(c => {
            let table = Object.keys(c)[0];
            let query = me.createQueryDelete(table, c[table]);
            queries.push(query);
        });

        this.bulkExecuteWithTransaction(queries, response => {
            if (type != null)
                callback({ [type]: response });
            else
                callback(response);
        });
    }

    createColumns(table) {
        let query = '( ';

        Models[table].forEach((col, i) => {
            query += ` ${col},`;
        });

        query = query.slice(0, -1);
        query += ' )';

        return query;
    }

    createValues(content, table) {
        let query = ' (';

        Models[table].forEach(c => {
            let val;
            if(moment((content[c]), 'DD/MM/YYYY',true).isValid()){
                let newDate = moment((content[c]), 'DD-MM-YYYY').format('DD/MMM/YYYY');
                val = `#${newDate}#`;
            }
            else if(typeof (content[c]) == "boolean" || Number.isFinite(content[c]))
                val = content[c];
            else if(content[c] === null || content[c] === undefined)
                val =  `NULL`;
            else 
                val =  `'${content[c]}'`;
            
            query += ` ${val},`;
        });

        query = query.slice(0, -1);
        query += ' )'

        return query;
    }

    createWhereClause(content) {
        let keys = Object.keys(content);
        let results = '';

        keys.forEach((c, i) => {
            results += `( ${c} = '${content[c]}' )`;

            if (content[keys[i + 1]])
                results += ' AND ';
        })

        return results;
    }

    createValuesUpdate(content, table) {
        let keys = Object.keys(content);
        let results = '';

        Models[table].forEach((c, i) => {
            if (content[c] === undefined) 
                return;

            let val;
            if(moment((content[c]), 'DD/MM/YYYY',true).isValid()){
                let newDate = moment((content[c]), 'DD-MM-YYYY').format('DD/MMM/YYYY');
                val = `#${newDate}#`;
            }
            else if(typeof (content[c]) == "boolean" || Number.isFinite(content[c]))
                val = content[c];
            else if((content[c] === null))
                val =  `NULL`;
            else 
                val =  `'${content[c]}'`;

            results += ` ${c} = ${val},`;
        })

        results = results
            .slice(0, -1);
        return results;
    }

    getRPJM(): Promise<any> {
        let whereClause = ` WHERE (Ta_RPJM_Bidang.Kd_Desa = '${this.kodeDesa}') ORDER BY Ta_RPJM_Bidang.Kd_Bid, Ta_RPJM_Kegiatan.Kd_Keg`;
        return this.query(queryRPJM + whereClause)
                .then(results => results.map(r => fromSiskeudes(r, "rpjm")));
    }

    getSumberDanaPaguTahunan(regionCode, callback) {
        let whereClause = ` WHERE (Ta_RPJM_Kegiatan.Kd_Desa = '${regionCode}') ORDER BY Ta_RPJM_Kegiatan.Kd_Bid, Ta_RPJM_Kegiatan.Kd_Keg`;
        this.get(querySumberdanaPaguTahunan + whereClause, callback)
    }

    getRenstraRPJM(tahun): Promise<any> {
        let whereClause = ` WHERE (Ta_RPJM_Visi.Kd_Desa = '${this.kodeDesa}') AND (Ta_Desa.Tahun = '${tahun}')`;
        return this.query(queryRenstraRPJM + whereClause);
    }

    getVisiRPJM(callback) {
        let whereClause = ` Where (Ta_Desa.Kd_Desa = '${this.kodeDesa}')`
        this.get(queryVisiRPJM + whereClause, callback)
    }

    getRKPByYear(rkp): Promise<any> {
        let whereClause = ` WHERE   (Bid.Kd_Desa = '${this.kodeDesa}') AND (Pagu.Kd_Tahun = 'THN${rkp}') ORDER BY Bid.Kd_Bid,Pagu.Kd_Keg`;
        return this.query(queryPaguTahunan + whereClause)
                .then(results => results.map(r => fromSiskeudes(r, "rkp")));
    }

    getRAB(year): Promise<any> {
        let queryPendapatan = queryPdptAndPby + ` WHERE (Rek1.Akun = '4.') OR (Rek1.Akun = '6.') AND (Ds.Kd_Desa = '${this.kodeDesa}') `
        let queryUnionALL = queryPendapatan + ' UNION ALL ' + queryBelanja + ` WHERE  (Ds.Kd_Desa = '${this.kodeDesa}') AND (Rek1.Akun = '5.') ORDER BY Rek1.Akun, Bdg.Kd_Bid, Keg.Kd_Keg, Rek3.Jenis, Rek4.Obyek, RABSub.Kd_SubRinci, RABRi.No_Urut`;
        return this
            .query(queryUnionALL)
    }

    getSumAnggaranRAB(callback) {
        let whereClause = ` Where (Ds.Kd_Desa = '${this.kodeDesa}') GROUP BY RAB.Tahun, Rek1.Nama_Akun, Rek2.Akun, Ds.Kd_Desa ORDER BY Rek2.Akun`;
        this.get(querySumRAB + whereClause, callback)
    }

    getDetailSPP(noSPP, callback) {
        let whereClause = ` WHERE  (S.No_SPP = '${noSPP}') ORDER BY SR.Kd_Rincian,SB.Tgl_Bukti, SB.No_Bukti, SPo.Kd_Rincian;`;
        this.get(queryDetailSPP + whereClause, callback);
    }

    async getMaxNoSPP(): Promise<any>{
        let whereClause = ` WHERE (Kd_Desa = '${this.kodeDesa}')`
        return this.query(queryGetMaxNoSPP + whereClause);
    }

    async getMaxNoBukti(): Promise<any>{
        let whereClause = ` WHERE (Kd_Desa = '${this.kodeDesa}')`
        return this.query(queryGetMaxNoBukti + whereClause);
    }

    async getRincianTBP(tahun): Promise<any>{
        let whereClause = ` HAVING (((A.Tahun)='${tahun}') AND ((A.Kd_Desa)='${this.kodeDesa}') AND ((A.Kd_Rincian) Like '4%') OR (A.Kd_Rincian LIKE '6.1%'))`
        return this.query(queryRincianTBP + whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "rincian_tbp")));
    }

    async getSPP(): Promise<any> {
        let whereClause = ` WHERE (Ta_SPP.Kd_Desa = '${this.kodeDesa}') ORDER BY Ta_SPP.No_SPP`
        return this.query(querySPP + whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "spp")));
    }

    async getSPPRinci(): Promise<any> {
        let whereClause = ` WHERE (Kd_Desa = '${this.kodeDesa}') ORDER BY No_SPP, Kd_Rincian`
        return this.query(querySPPRinci + whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "spp_rinci")));
    }

    async getSPPBukti(): Promise<any> {
        let whereClause = ` WHERE (Kd_Desa = '${this.kodeDesa}') ORDER BY No_SPP, Kd_Rincian, No_Bukti`
        return this.query(querySPPBukti + whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "spp_bukti")));
    }

    async getTBP(): Promise<any> {
        let whereClause = ` WHERE Kd_Desa = '${this.kodeDesa}' ORDER BY No_Bukti`
        return this.query(queryTBP + whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "tbp")));
    }

    async getTBPRinci(): Promise<any> {
        let whereClause = ` WHERE Kd_Desa = '${this.kodeDesa}' ORDER BY No_Bukti, Kd_Rincian`
        return this.query(queryTBPRinci + whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "tbp_rinci")));
    }

    async getTaKegiatan(tahun): Promise<any>{
        let whereClause = ` WHERE (Bid.Tahun = '${tahun}') AND (Bid.Kd_Desa = '${this.kodeDesa}') ORDER BY Bid.Kd_Bid, Keg.Kd_Keg`;
        return this
            .query(queryTaKegiatan+whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "kegiatan")));
    }

    async getAllKegiatan(): Promise<any> {
        let whereClause = ` WHERE  (Keg.Kd_Desa = '${this.kodeDesa}')`;
        return this.query(queryGetAllKegiatan + whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "kegiatan")));
    }

    async getPostingLog(): Promise<any> {
        let whereClause = ` WHERE (Ta_AnggaranLog.Kd_Desa = '${this.kodeDesa}')`;
        return this.query(queryAnggaranLog + whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "posting_log")));
    }

    async getTaDesa(): Promise<any> {
        let whereClause = ` WHERE   (Ta_Desa.Kd_Desa = '${this.kodeDesa}')`;
        return this.query(queryTaDesa + whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "desa")));
    } 
    async getRefKegiatan(): Promise<any> {
        return this.query(queryRefKegiatan)
        .then(results => results.map(r => fromSiskeudes(r, "ref_kegiatan")));
    }

    async getRefBidang(): Promise<any> {
        return this.query(queryRefBidang)
        .then(results => results.map(r => fromSiskeudes(r, "ref_bidang")));
    }

    async getRpjmBidangAdded(): Promise<any> {
        return this.query(queryRpjmBidang);
    }

    async getPenyetoran(){
        let whereClause = ` WHERE (Kd_Desa = '${this.kodeDesa}')`;
        return this.query(querySts + whereClause)
            .then(results => results.map(r => fromSiskeudes(r, "sts")));
    }      

    getRABSub(callback) {
        this.get(queryRABSub, callback);
    }

    getKegiatanByCodeRinci(code, callback) {
        let whereClause = ` WHERE  (Ta_RABSub.Kd_Rincian = '${code}')`;
        this.get(queryGetKodeKegiatan + whereClause, callback);
    }

    getRefPotongan(callback) {
        this.get(queryRefPotongan, callback);
    }

    getRefBidangAndKegiatan(regionCode, callback) {
        let whereClause = ` WHERE  (Ta_Desa.Kd_Desa = '${regionCode}')  ORDER BY    Ta_Bidang.Kd_Bid, Ta_Kegiatan.Kd_Keg`;
        this.get(queryGetBidAndKeg + whereClause, callback);
    }

    getRefRekByCode(code, callback) {
        let whereClause = `WHERE (Rek1.Akun = '${code}') ORDER BY Rek1.Akun, Rek2.Kelompok, Rek3.Jenis, Rek4.Obyek`;
        this.get(queryGetRefRek + whereClause, callback);
    }

    getRefRekByKelompok(code, callback) {
        let whereClause = `WHERE (Rek2.Kelompok = '${code}') ORDER BY Rek1.Akun, Rek2.Kelompok, Rek3.Jenis, Rek4.Obyek`;
        this.get(queryGetRefRek + whereClause, callback);
    }

    getRefSumberDana(): Promise<any> {
        return this.query(queryRefSumberdana);
    }

    getRPJMBidAndKeg(callback) {
        let whereClause = ` WHERE (Ta_RPJM_Bidang.Kd_Desa = '${this.kodeDesa}') ORDER BY Ta_RPJM_Bidang.Kd_Bid, Ta_RPJM_Kegiatan.Kd_Keg`;
        this.get(queryRPJMBidAndKeg + whereClause, callback)
    }

    getTaBidangAvailable(callback){
        let whereClause = `WHERE (Kd_Desa = '${this.kodeDesa}')`;
        this.get(queryTaBidang+whereClause, callback)
    }

    getTaPemda(): Promise<any>{
        return this.query(queryTaPemda);
    }

    applyFixMultipleMisi(callback) {
        this.execute(queryFixMultipleMisi, callback);
    }

    getPencairanSPP(noSPP, callback){
        let whereClause = ` WHERE (Kd_Desa = '${this.kodeDesa}') AND (No_SPP = '${noSPP}')`;
        this.get(queryPencairanSPP + whereClause, callback);
    }
    

    getMaxNoTBP(callback){
        let whereClause = ` WHERE (Kd_Desa = '${this.kodeDesa}')`;
        this.get(queryGetMaxNoTBP + whereClause, callback);
    }

    getMaxNoSTS(callback){
        let whereClause = ` WHERE (Kd_Desa = '${this.kodeDesa}')`;
        this.get(queryGetMaxSTS + whereClause, callback);
    }


    async getSisaAnggaran(tahun, kodeKegiatan, tanggalSpp, kodePosting): Promise<any> {        
        let query = `SELECT Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Nama_Rincian, SumberDana, SUM(JmlAnggaran) AS Sisa 
                    FROM ( SELECT        A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek AS Nama_Rincian, A.SumberDana, SUM(A.Anggaran) AS JmlAnggaran, C.Tgl_Perdes
                        FROM            ((Ta_Anggaran A INNER JOIN
                                                Ref_Rek4 B ON A.Kd_Rincian = B.Obyek) INNER JOIN
                                                Ta_Desa C ON A.Tahun = C.Tahun AND A.Kd_Desa = C.Kd_Desa)
                        WHERE        (A.Tahun = '${tahun}') AND (A.Kd_Desa = '${this.kodeDesa}') AND (A.Kd_Keg = '${kodeKegiatan}') AND (A.TglPosting <= #${tanggalSpp}#) AND (A.KdPosting = '${kodePosting}')
                        GROUP BY A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek, A.SumberDana, C.Tgl_Perdes
                        UNION ALL
                        SELECT        A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek AS Nama_Rincian, A.SumberDana, SUM(A.AnggaranPAK) AS JmlAnggaran, C.Tgl_Perdes_PB
                        FROM            ((Ta_Anggaran A INNER JOIN
                                                Ref_Rek4 B ON A.Kd_Rincian = B.Obyek) INNER JOIN
                                                Ta_Desa C ON A.Tahun = C.Tahun AND A.Kd_Desa = C.Kd_Desa)
                        WHERE        (A.Tahun = '${tahun}') AND (A.Kd_Desa = '${this.kodeDesa}') AND (A.Kd_Keg = '${kodeKegiatan}') AND (A.TglPosting <= #${tanggalSpp}#) AND (A.KdPosting = '99')
                        GROUP BY A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek, A.SumberDana, C.Tgl_Perdes_PB
                        UNION ALL
                        SELECT        A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek AS Nama_Rincian, A.Sumberdana, SUM(- A.Nilai) AS JmlAnggaran, C.Tgl_SPP
                        FROM            ((Ta_SPP C INNER JOIN
                                                (Ta_SPPRinci A INNER JOIN
                                                Ref_Rek4 B ON A.Kd_Rincian = B.Obyek) ON C.No_SPP = A.No_SPP) LEFT OUTER JOIN
                                                Ta_SPJ D ON C.No_SPP = D.No_SPP)
                        WHERE        (A.Tahun = '${tahun}') AND (A.Kd_Desa = '${this.kodeDesa}') AND (A.Kd_Keg = '${kodeKegiatan}') AND (D.No_SPJ IS NULL)
                        GROUP BY A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek, A.Sumberdana, C.Tgl_SPP
                        UNION ALL
                        SELECT        A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek AS Nama_Rincian, A.Sumberdana, SUM(- A.Nilai) AS JmlAnggaran, C.Tgl_SPJ
                        FROM            ((Ta_SPJRinci A INNER JOIN
                                                Ref_Rek4 B ON A.Kd_Rincian = B.Obyek) INNER JOIN
                                                Ta_SPJ C ON A.No_SPJ = C.No_SPJ)
                        WHERE        (A.Tahun = '${tahun}') AND (A.Kd_Desa = '${this.kodeDesa}') AND (A.Kd_Keg = '${kodeKegiatan}')
                        GROUP BY A.Tahun, A.Kd_Desa, A.Kd_Keg, A.Kd_Rincian, B.Nama_Obyek, A.Sumberdana, C.Tgl_SPJ
                        ) AS DrvA GROUP BY Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Nama_Rincian, SumberDana ORDER BY Kd_Rincian`
        return this.query(query)
            .then(results => results.map(r => fromSiskeudes(r, "sisa_anggaran")));
    }

    postingAPBDes(data, statusAPBDES, callback) {
        let model = toSiskeudes(data, 'posting_log');
        let queries = [];
        let queryUpdateTaDesa = (statusAPBDES == 'AWAL') ? 
            `UPDATE Ta_Desa SET No_Perdes = '${model.No_Perdes}', Tgl_Perdes = #${model.TglPosting}#, No_Perdes_PB = '${model.No_Perdes}', Tgl_Perdes_PB = #${model.TglPosting}# ` :
            `UPDATE Ta_Desa SET No_Perdes_PB = '${model.No_Perdes}', Tgl_Perdes_PB = #${model.TglPosting}# `

        let queryInsertTaAnggaran = `INSERT INTO Ta_Anggaran ( KdPosting, Tahun, KURincianSD, Kd_Rincian, RincianSD, Anggaran, AnggaranStlhPAK, AnggaranPAK, Belanja, Kd_Keg, SumberDana, Kd_Desa, TglPosting )
                                    SELECT  '${model.KdPosting}', Tahun, [Ta_RABRinci.Kd_Keg] & [Ta_RABRinci.Kd_Rincian] & [Ta_RABRinci.SumberDana] AS KURincianSD, Kd_Rincian, [Ta_RABRinci.Kd_Rincian] & [Ta_RABRinci.SumberDana] AS RincianSD, 
                                    SUM(JmlSatuan * HrgSatuan) AS Anggaran,SUM(JmlSatuanPAK * HrgSatuanPAK) AS AnggaranStlhPAK,SUM(JmlSatuanPAK * HrgSatuanPAK)-SUM(JmlSatuan * HrgSatuan) AS AnggaranPAK, IIF(Kd_Rincian < '5.', 'PDPT', (IIF(Kd_Rincian < '6.','BOP','PBY'))) AS Belanja, Kd_Keg, SumberDana, Kd_Desa, #${model.TglPosting}#
                                    FROM   Ta_RABRinci `

        queries.push(`DELETE FROM Ta_Anggaran WHERE KdPosting = '${model.KdPosting}';`,
            `DELETE FROM Ta_AnggaranLog WHERE KdPosting = '${model.KdPosting}';`,
            `DELETE FROM Ta_AnggaranRinci WHERE KdPosting = '${model.KdPosting}';`,
            `${queryUpdateTaDesa} WHERE (Kd_Desa = '${this.kodeDesa}');`,
            `${queryInsertTaAnggaran} WHERE  (Kd_Desa = '${this.kodeDesa}') GROUP BY Tahun, Kd_Keg, Kd_Rincian, Kd_Desa, SumberDana`,
            `INSERT INTO Ta_AnggaranLog (KdPosting, Tahun, Kd_Desa, No_Perdes, TglPosting, Kunci) VALUES ('${model.KdPosting}', '${model.Tahun}', '${this.kodeDesa}', '${model.No_Perdes}', #${model.TglPosting}#, false);`,
            `INSERT INTO Ta_AnggaranRinci (Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Kd_SubRinci, No_Urut, SumberDana, Uraian, Satuan, JmlSatuan, HrgSatuan, Anggaran, JmlSatuanPAK, HrgSatuanPAK, AnggaranStlhPAK, KdPosting)
                      SELECT Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Kd_SubRinci, No_Urut, SumberDana, Uraian, Satuan, JmlSatuan, HrgSatuan, Anggaran, JmlSatuanPAK, HrgSatuanPAK, AnggaranStlhPAK,  ${model.KdPosting} 
                      FROM Ta_RABRinci WHERE (Kd_Desa = '${this.kodeDesa}');`);

        this.bulkExecuteWithTransaction(queries, callback);
    }

    updateSPPRinci(noSPP, kdKeg, callback){
        let query =  `SELECT  SUM(Nilai) AS Nilai, No_SPP, Kd_Rincian, Kd_Keg FROM  Ta_SPPBukti WHERE   (No_SPP = '${noSPP}') AND (Kd_Keg = '${kdKeg}') GROUP BY No_SPP, Kd_Rincian, Kd_Keg`;
        this.get(query, data =>{
            let results = [];            
            data.forEach(c => {
                let query = `UPDATE Ta_SPPRinci Set Ta_SPPRinci.Nilai = ${c.Nilai} WHERE (Ta_SPPRinci.No_SPP = '${c.No_SPP}') AND (Ta_SPPRinci.Kd_Keg = '${c.Kd_Keg}')`
                results.push(query)
            })
            this.bulkExecuteWithTransaction(results, response =>{
                this.updateSPP(noSPP, results =>{
                    console.log('Status Update Ta_SPPRinci',response);
                    console.log('Status Update Ta_SPP',results);
                    callback(response)
                })                
            })
        })
    }
    
    updateSPP(noSPP, callback ){
        let query = `SELECT Ta_SPPRinci.No_SPP, SUM(Ta_SPPRinci.Nilai) AS Jumlah, IIF(SUM(Ta_SPPPot.Nilai) is null, 0,SUM(Ta_SPPPot.Nilai))  AS Potongan
                    FROM    (Ta_SPPRinci LEFT OUTER JOIN  Ta_SPPPot ON Ta_SPPRinci.No_SPP = Ta_SPPPot.No_SPP)                    
                    WHERE (Ta_SPPRinci.No_SPP = '${noSPP}')
                    GROUP BY Ta_SPPRinci.No_SPP`

        this.get(query, data =>{
            let results = [];            
            data.forEach(c => {
                let query = `UPDATE Ta_SPP Set Ta_SPP.Jumlah = ${c.Jumlah}, Ta_SPP.Potongan = ${c.Potongan} WHERE (Ta_SPP.No_SPP = '${c.No_SPP}')`
                results.push(query)
            })
            this.bulkExecuteWithTransaction(results, response =>{
                callback(response)
            })
        })
    }

    updateSumberdanaTaKegiatan(callback){
        let query = `SELECT DISTINCT RABRi.Kd_Keg, RABRi.SumberDana FROM (Ta_Kegiatan Keg INNER JOIN Ta_RABRinci RABRi ON Keg.Tahun = RABRi.Tahun AND Keg.Kd_Keg = RABRi.Kd_Keg) WHERE (Keg.Kd_Desa = '${this.kodeDesa}')`;
        let queries = [];
        let results = [];

        this.get(query, data => {
            data.forEach(row => {                
                let findResult = results.find(c => c.Kd_Keg == row.Kd_Keg);
                
                if(!findResult){                
                    let query = ` UPDATE Ta_Kegiatan SET Sumberdana = '${row.SumberDana}' WHERE (Kd_Keg = '${row.Kd_Keg}')`;
                    results.push({ Kd_Keg: row.Kd_Keg, Sumberdana: [row.SumberDana], query: query });
                }
                else {
                    findResult.Sumberdana.push(row.SumberDana)
                    findResult.query = ` UPDATE Ta_Kegiatan SET Sumberdana = '${findResult.Sumberdana.join(', ')}' WHERE (Kd_Keg = '${row.Kd_Keg}')`;                    
                }                
            });

            console.log(results)
            let queries = results.map(c => c.query);
            this.bulkExecuteWithTransaction(queries, callback)      
        })
    }


    createQueryInsert(table, content) {
        let columns = this.createColumns(table);
        let values = this.createValues(content, table);

        return `INSERT INTO ${table} ${columns} VALUES ${values}`;
    }

    createQueryUpdate(table, content) {
        let values = this.createValuesUpdate(content.data, table);
        let whereClause = this.createWhereClause(content.whereClause);

        return `UPDATE ${table} SET ${values} WHERE ${whereClause}`;
    }

    createQueryDelete(table, content) {
        let whereClause = this.createWhereClause(content.whereClause);

        return `DELETE FROM ${table} WHERE ${whereClause}`;
    }

    getAllDesa(fileName, callback){
        let config = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + fileName;
        let connection = ADODB.open(config); 

        let query = `SELECT Ta_Desa.Kd_Desa, Ref_Desa.Nama_Desa FROM Ref_Kecamatan INNER JOIN (Ref_Desa INNER JOIN Ta_Desa ON Ref_Desa.Kd_Desa = Ta_Desa.Kd_Desa) ON Ref_Kecamatan.Kd_Kec = Ref_Desa.Kd_Kec; `
        
        connection
            .query(query)
            .on('done', function (data) {
                callback(data);
            })
            .on('fail', function (error) {
                callback(error);
            });
    }

    createNewDB(model, callback){
        let config = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + model.fileName;
        let connection = ADODB.open(config); 
        let queries = [];

        
        //insert Ta_Pemda
        //queries.push(`INSERT INTO Ta_Pemda ( Tahun, Kd_Prov, Kd_Kab, Nama_Pemda, Nama_Provinsi, C_Kode, C_Pemda, C_Data ) VALUES ('${model.Tahun}', '${model.Kd_Prov}', '${model.Kd_Kab}','${model.Nama_Pemda}', '${model.Nama_Provinsi}', '6141564142405431384747323860506138314154546135475066383135','${"mffafmdekfd`lieadodkipifjmh`fgfejlcakfgdfkfehnjklehfdoceji"}','MHJGIKOGQHOIILIEKOKMJKHMIULKNDNGGPJHJGIIJJSGNNHOKDNMJNIEHP');`);
        
        //insert Ref_Kecamatan                    
        queries.push(`INSERT INTO Ref_Kecamatan ( Kd_Kec, Nama_Kecamatan ) VALUES ('${model.Kd_Kec}', '${model.Nama_Kecamatan}');`);        

        //insert Ref_Desa                    
        queries.push(`INSERT INTO Ref_Desa ( Kd_Kec, Kd_Desa, Nama_Desa ) VALUES ('${model.Kd_Kec}','${model.Kd_Desa}', '${model.Nama_Kecamatan}');`);

        //insert Ta_Desa                  
        queries.push(`INSERT INTO Ta_Desa ( Tahun, Kd_Desa, Status ) VALUES ('${model.Tahun}','${model.Kd_Desa}', 'AWAL');`);

        //insert Ta_UserDesa                
        queries.push(`INSERT INTO Ta_UserDesa ( UserID, Kd_Kec, Kd_Desa ) VALUES ('${'èÜÒÖ'}','${model.Kd_Kec}', '${model.Kd_Desa}');`);

        //insert Ta_RPJMVisi:  Tahun APBDES + 6 sesuai permendagri 114 tahun 2014
        queries.push(`INSERT INTO Ta_RPJM_Visi ( ID_Visi, Kd_Desa, No_Visi, Uraian_Visi, TahunA, TahunN ) VALUES ('${model.Kd_Desa}01.','${model.Kd_Desa}', '01','Terciptanya Desa MADANI', '${model.Tahun}','${parseInt(model.Tahun) + 6}');`);

        //insert Ref_Bidang to Ta_Bidang, Where Kd_Bid != 05 karena untuk bidang ke 05 jarang dipakai
        queries.push(`INSERT INTO Ta_Bidang (Tahun, Kd_Desa, Kd_Bid, Nama_Bidang) 
                        SELECT '${model.Tahun}', '${model.Kd_Desa}', '${model.Kd_Desa}' & Kd_Bid, Nama_Bidang FROM Ref_Bidang WHERE (Kd_Bid NOT IN ('05'))`);

        //insert Ref_Kegiatan to Ta_Kegiatan,
        queries.push(`INSERT INTO Ta_Kegiatan (Tahun, Kd_Desa, Kd_Bid, Kd_Keg, ID_Keg, Nama_Kegiatan, Pagu, Pagu_PAK)  SELECT '${model.Tahun}', '${model.Kd_Desa}', '${model.Kd_Desa}' & Kd_Bid AS Kd_Bid, '${model.Kd_Desa}' & ID_Keg, ID_Keg, Nama_Kegiatan, 0, 0 FROM Ref_Kegiatan WHERE (Kd_Bid NOT IN ('05'))`);
        
        //insert default RAB
        queries.push(`INSERT INTO Ta_RAB (Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Anggaran, AnggaranPAK, AnggaranStlhPAK) VALUES ('${model.Tahun}', '${model.Kd_Desa}', '${model.Kd_Desa}00.00.', '4.1.1.01.', 0, 0, 0);`,
                     `INSERT INTO Ta_RAB (Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Anggaran, AnggaranPAK, AnggaranStlhPAK) VALUES ('${model.Tahun}', '${model.Kd_Desa}', '${model.Kd_Desa}01.01.', '5.1.1.01.', 0, 0, 0);`,
                    `INSERT INTO Ta_RAB (Tahun, Kd_Desa, Kd_Keg, Kd_Rincian, Anggaran, AnggaranPAK, AnggaranStlhPAK) VALUES ('${model.Tahun}', '${model.Kd_Desa}', '${model.Kd_Desa}00.00.', '6.1.1.01.', 0, 0, 0);`)

        let q : any = queries;

        connection
            .bulkExecuteWithTransaction(q)
            .on('done', function (data) {                
                callback(data)
            })
            .on('fail', function (error) {
                callback(error);
            });        
    }
}
