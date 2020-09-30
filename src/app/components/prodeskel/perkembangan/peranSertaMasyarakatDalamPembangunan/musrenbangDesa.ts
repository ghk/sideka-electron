import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { MusrembangDesaYaTidakOptions, MusrembangDesaAdaTidakAdaOptions } from '../../options';
import {MusrembangDesaAdaTidakAdaOptions, MusrembangDesaAdaTidakAdaOptions} from '../../options';

@Component({
    selector: 'prodeskel-peran-serta-masyarakat-dalam-pembangunan-musrenbang-desa',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPeranSertaMasyarakatDalamPembangunanMusrenbangDesa extends ProdeskelBase {
    title: string = 'Musrenbang Desa / Kelurahan';
    gridType: string = 'grid_k35a3';
    formType: string = 'form_k35a3';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k35703", label: "Jumlah musyawarah perencanaan pembangunan tingkat Desa/Kelurahan yang dilakukan pada tahun ini, termasuk di tingkat dusun dan lingkungan", type: "number", groupIndex: 1 },
        { field: "k35704", label: "Jumlah kehadiran masyarakat dalam setiap kali musyawarah tingkat dusun/lingkungan dan desa/kelurahan", type: "number", groupIndex: 1 },
        { field: "k35705", label: "Jumlah peserta laki-laki dalam Musrenbang di desa/kelurahan", type: "number", groupIndex: 1 },
        { field: "k35706", label: "Jumlah peserta perempuan dalam Musrenbang di desa dan kelurahan", type: "number", groupIndex: 1 },
        { field: "k35707", label: "Jumlah Musyawarah Antar Desa dalam perencanaan pembangunan yang dikoordinasikan Kecamatan", type: "number", groupIndex: 1 },
        { field: "k35708", label: "Penggunaan Profil Desa/Kelurahan sebagai sumber data dasar yang digunakan dalam perencanaan pembangunan desa dan forum Musrenbang Partisipatif", type: "radio", options: MusrembangDesaYaTidakOptions, groupIndex: 1 },
        { field: "k35709", label: "Penggunaan data BPS dan data sektoral dalam perencanaan pembangunan partisipatif dan Musrenbang di desa dan Kelurahan", type: "radio", options: MusrembangDesaYaTidakOptions, groupIndex: 1 },
        { field: "k35710", label: "Pelibatan masyarakat dalam pemutakhiran data profil desa dan kelurahan sebagai bahan dalam Musrenbang partisipatif", type: "radio", options: MusrembangDesaYaTidakOptions, groupIndex: 1 },
        { field: "k35711", label: "Usulan masyarakat yang disetujui menjadi Rencana Kerja Desa dan Kelurahan", type: "number", groupIndex: 1 },
        { field: "k35712", label: "Usulan Pemerintah Desa dan Kelurahan yang disetujui menjadi Rencana Kerja Desa/Kelurahan dan dimuat dalam RAPB-Desa", type: "number", groupIndex: 1 },
        { field: "k35713", label: "Usulan rencana kerja program dan kegiatan dari pemerintah kabupaten/kota/provinsi dan pusat yang dibahas saat Musrenbang dan disetujui untuk dilaksanakan di desa dan kelurahan oleh masyarakat dan lembaga kemasyarakatan desa/kelurahan", type: "number", groupIndex: 1 },
        { field: "k35714", label: "Usulan rencana kerja pemerintah tingkat atas yang ditolak dalam Musrenbangdes/kel", type: "number", groupIndex: 1 },
        { field: "k35715", label: "Pemilikan dokumen Rencana Kerja Pembangunan Desa/Kelurahan (RKPD/K)", type: "radio", options: MusrembangDesaAdaTidakAdaOptions, groupIndex: 1 },
        { field: "k35716", label: "Pemilikan Rencana Pembangunan Jangka Menengah Desa/Kelurahan (RPJMD/K)", type: "radio", options: MusrembangDesaAdaTidakAdaOptions, groupIndex: 1 },
        { field: "k35717", label: "Pemilikan dokumen hasil Musrenbang tingkat Desa dan Kelurahan yang diusulkan ke pemerintah tingkat atas untuk dibiayai dari APBD Kab/Kota, APBD Provinsi dan APBN maupun sumber biaya dari perusahaan swasta yang investasi di desa/kelurahan", type: "radio", options: MusrembangDesaAdaTidakAdaOptions, groupIndex: 1 },
        { field: "k35718", label: "Jumlah kegiatan yang diusulkan masyarakat melalui forum Musrenbangdes/kel yang tidak direalisasikan dalam APB-Desa, APB-Daerah Kabupaten/Kota dan Provinsi", type: "number", groupIndex: 1 },
        { field: "k35719", label: "Jumlah kegiatan yang diusulkan masyarakat melalui forum Musrenbangdes/kel yang pelaksanaannya tidak sesuai dengan hasil Musrenbang", type: "number", groupIndex: 1 }
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
