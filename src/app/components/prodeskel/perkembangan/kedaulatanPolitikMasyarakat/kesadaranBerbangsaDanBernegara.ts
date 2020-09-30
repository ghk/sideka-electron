import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-kedaulatan-politik-masyarakat-kesadaran-berbangsa-dan-bernegara',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelKedaulatanPolitikMasyarakatKesadaranBerbangsaDanBernegara extends ProdeskelBase {
    title: string = 'Kesadaran Berbangsa Dan Bernegara';
    gridType: string = 'grid_k35';
    formType: string = 'form_k35';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        {field:"k35620",label:"Jenis kegiatan pemantapan nilai Ideologi Pancasila sebagai Dasar Negara",type:"number",groupIndex:1},
        {field:"k35621",label:"Jumlah kegiatan pemantapan nilai Ideologi Pancasila sebagai Dasar Negara",type:"number",groupIndex:1},
        {field:"k35622",label:"Jenis-jenis kegiatan pemantapan nilai Bhinneka Tunggal Ika",type:"number",groupIndex:1},
        {field:"k35623",label:"Jumlah kegiatan pemantapan nilai Bhinneka Tunggal Ika",type:"number",groupIndex:1},
        {field:"k35624",label:"Jenis kegiatan pemantapan kesatuan bangsa lainnya",type:"number",groupIndex:1},
        {field:"k35625",label:"Jumlah kegiatan pemantapan kesatuan bangsa lainnya",type:"number",groupIndex:1},
        {field:"k35626",label:"Jumlah kasus warga desa/kelurahan yang minta suaka/lari ke luar negeri",type:"number",groupIndex:1},
        {field:"k35627",label:"Jumlah warga yang melintasi perbatasan ke negara tetangga secara resmi",type:"number",groupIndex:1},
        {field:"k35628",label:"Jumlah  warga  yang  melintasi  perbatasan  negara  tetangga secara tidak resmi",type:"number",groupIndex:1},
        {field:"k35629",label:"Jumlah kasus pertempuran atau perlawanan antar kelompok pengacau keamanan di perbatasan negara dengan warga/aparat dari desa/kelurahan",type:"number",groupIndex:1},
        {field:"k35630",label:"Jumlah serangan terhadap fasilitas umum dan milik masyarakat oleh kelompok pengacau di desa/kelurahan perbatasan negara tetangga",type:"number",groupIndex:1},
        {field:"k35631",label:"Jumlah kasus  yang  diklasifikasikan merongrong keutuhan NKRI  dan  Kesatuan  Bangsa  Indonesia  di  desa/kelurahan tahun ini",type:"number",groupIndex:1},
        {field:"k35632",label:"Jumlah  korban  manusia  baik  luka  maupun  tewas  serta korban materi lainnya akibat serangan kelompok pengacau keamanan",type:"number",groupIndex:1},
        {field:"k35633",label:"Jumlah masalah ketenagakerjaan di perbatasan antar negara yang terjadi tahun ini",type:"number",groupIndex:1},
        {field:"k35634",label:"Jumlah kasus kejahatan pencurian, penjarahan, perampokan dan  intimidasi  serta  teror  yang  terjadi  di  desa/kelurahan perbatasan antar negara",type:"number",groupIndex:1},{field:"k35635",label:"Jumlah sengketa perbatasan antar negara yang  terjadi desa/kelurahan ini",type:"number",groupIndex:1},
        {field:"k35636",label:"Jumlah kasus sengketa perbatasan yang terjadi baik antar desa/kelurahan dalam kecamatan maupun antar kecamatan, antar kabupaten/kota dan desa/kelurahan antar provinsi",type:"number",groupIndex:1},{field:"k35637",label:"Jumlah kasus yang terkait dengan perbatasan antar negara yang dilaporkan Kepala Desa/Lurah ke pemerintah tingkat atasnya",type:"number",groupIndex:1},
        {field:"k35638",label:"Jumlah kasus yang mengarah kepada tindakan disintegrasi bangsa dan pengingkaran NKRI, Pancasila, UUD 1945 dan Bhinneka Tunggal Ika yang difasilitasi penyelesaiannya oleh Kepala Desa/Lurah",type:"number",groupIndex:1},{field:"k35639",label:"Jumlah kasus penangkapan nelayan asing di wilayah perairan desa/kelurahan",type:"number",groupIndex:1},
        {field:"k35640",label:"Jumlah kasus penangkapan nelayan/petani/peternak/ pekebun/perambah hutan asal desa/kelurahan di perairan dan daratan wilayah negara lain",type:"number",groupIndex:1}
    ]



    constructor(
        toastr: ToastsManager,
        vcr: ViewContainerRef,
        prodeskelService: ProdeskelService,
        settingsService: SettingsService,
    ) {
        super(toastr, vcr, prodeskelService, settingsService);
    }

    setOverrideValues(): void {
        let date = new Date();
        this.overrideValues['tanggal'] = this.encodeDate(date);
    }
}
