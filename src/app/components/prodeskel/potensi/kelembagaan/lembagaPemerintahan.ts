import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { DasarHukumPembentukanPemerintahanOptions, DasarHukumPembentukanBpdOptions, AdaTidakAdaOptions, AdaTidakAdaAktifOptions, PendidikanOptions, AktifPasifOptions, JenisKelaminOptions, StatusKepegawaianOptions } from '../../options';

@Component({
    selector: 'prodeskel-kelembagaan-lembaga-pemerintahaan',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelKelembagaanLembagaPemerintahan extends ProdeskelBase {
    title: string = 'Lembaga Pemerintahaan';
    gridType: string = 'grid_t55';
    formType: string = 'form_t55';

    schemaGroups: string[] = [null, 'Pemerintah Desa/Kelurahan', 'Pendidikan Aparat Desa', 'Badan Perwakilan Desa', 'Pendidikan Anggota BPD'];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'date', hidden: true, groupIndex: 0 },
        { field: 't55547', label: 'Dasar Hukum Pembentukan', type: 'radio', options: DasarHukumPembentukanPemerintahanOptions, groupIndex: 1 },
        { field: 't55548', label: 'Dasar Hukum Pembentukan BPD', type: 'radio', options: DasarHukumPembentukanBpdOptions, groupIndex: 1 },
        { field: 't55549', label: 'Jumlah Aparat Pemerintahan (orang)', type: 'number', groupIndex: 1 },
        { field: 't55550', label: 'Jumlah Perangkat Desa/Kelurahan', type: 'number', groupIndex: 1 },
        { field: 't55551', label: 'Kepala Desa/Lurah', type: 'radio', options: AdaTidakAdaOptions, groupIndex: 1 },
        { field: 't55552', label: 'Sekretaris Desa/Kelurahan', type: 'radio', options: AdaTidakAdaOptions, groupIndex: 1 },
        { field: 't55553', label: 'Kepala Urusan/Seksi Pemerintahan', type: 'radio', options: AdaTidakAdaAktifOptions, groupIndex: 1 },
        { field: 't55554', label: 'Kepala Urusan/Seksi Pembangunan', type: 'radio', options: AdaTidakAdaAktifOptions, groupIndex: 1 },
        { field: 't55555', label: 'Kepala Urusan/Seksi Pemberdayaan Masyarakat', type: 'radio', options: AdaTidakAdaAktifOptions, groupIndex: 1 },
        { field: 't55556', label: 'Kepala Urusan/Seksi Kesejahteraan Rakyat', type: 'radio', options: AdaTidakAdaAktifOptions, groupIndex: 1 },
        { field: 't55557', label: 'Kepala Urusan/Seksi Umum', type: 'radio', options: AdaTidakAdaAktifOptions, groupIndex: 1 },
        { field: 't55558', label: 'Kepala Urusan/Seksi Keuangan', type: 'radio', options: AdaTidakAdaAktifOptions, groupIndex: 1 },
        { field: 't55559', label: 'Kepala Urusan/Seksi Perekonomian', type: 'radio', options: AdaTidakAdaAktifOptions, groupIndex: 1 },
        { field: 't55560', label: 'Kepala Urusan/Seksi Data dan Informasi', type: 'radio', options: AdaTidakAdaAktifOptions, groupIndex: 1 },
        { field: 't55561', label: 'Jumlah Staf', type: 'number', groupIndex: 1 },
        { field: 't55562', label: 'Jumlah Dusun di Desa/Kelurahan (Sebutan Lain)', type: 'number', groupIndex: 1 },
        { field: 't55563', label: 'Kepala Dusun/Lingkungan 1', type: 'radio', options: AktifPasifOptions, groupIndex: 1 },
        { field: 't55564', label: 'Kepala Dusun/Lingkungan 2', type: 'radio', options: AktifPasifOptions, groupIndex: 1 },
        { field: 't55565', label: 'Kepala Dusun/Lingkungan 3', type: 'radio', options: AktifPasifOptions, groupIndex: 1 },
        { field: 't55566', label: 'Kepala Dusun/Lingkungan 4', type: 'radio', options: AktifPasifOptions, groupIndex: 1 },
        { field: 't55567', label: 'Kepala Dusun/Lingkungan 5', type: 'radio', options: AktifPasifOptions, groupIndex: 1 },
        { field: 't55569', label: 'Kepala Desa/Lurah', type: 'radio', options: PendidikanOptions, groupIndex: 2 },
        { field: 't55569a', label: 'Pangkat/Golongan', type: 'text', groupIndex: 2 },
        { field: 't55569b', label: 'NIP', type: 'text', groupIndex: 2 },
        { field: 't55569c', label: 'Pelatihan yang pernah diikuti', type: 'textarea', groupIndex: 2 },
        { field: 't55569d', label: 'Jenis Kelamin', type: 'radio', options: JenisKelaminOptions, groupIndex: 2 },
        { field: 't55570', label: 'Sekretaris Desa/Kelurahan', type: 'radio', options: PendidikanOptions, groupIndex: 2 },
        { field: 't55570a', label: 'Nama Sekretaris Desa/Kelurahan', type: 'text', groupIndex: 2 },
        { field: 't55570f', label: 'Status Kepegawaian', type: 'radio', options: StatusKepegawaianOptions, groupIndex: 2 },
        { field: 't55570b', label: 'Pangkat/Golongan', type: 'text', groupIndex: 2 },
        { field: 't55570c', label: 'NIP', type: 'text', groupIndex: 2 },
        { field: 't55570d', label: 'Pelatihan yang pernah diikuti', type: 'textarea', groupIndex: 2 },
        { field: 't55570e', label: 'Jenis Kelamin', type: 'radio', options: JenisKelaminOptions, groupIndex: 2 },
        { field: 't55571', label: 'Kepala Urusan/Seksi Pemerintahan', type: 'radio', options: PendidikanOptions, groupIndex: 2 },
        { field: 't55572', label: 'Kepala Urusan/Seksi Pembangunan', type: 'radio', options: PendidikanOptions, groupIndex: 2 },
        { field: 't55573', label: 'Kepala Urusan/Seksi Pemberdayaan', type: 'radio', options: PendidikanOptions, groupIndex: 2 },
        { field: 't55574', label: 'Kepala Urusan/Seksi Kesejahteraan Rakyat', type: 'radio', options: PendidikanOptions, groupIndex: 2 },
        { field: 't55575', label: 'Kepala Urusan/Seksi Umum', type: 'radio', options: PendidikanOptions, groupIndex: 2 },
        { field: 't55576', label: 'Kepala Urusan/Seksi Keuangan', type: 'radio', options: PendidikanOptions, groupIndex: 2 },
        { field: 't55577a', label: 'Kepala Urusan/Seksi Perekonomian', type: 'radio', options: PendidikanOptions, groupIndex: 2 },
        { field: 't55578a', label: 'Kepala Urusan/Seksi Data dan Informasi', type: 'radio', options: PendidikanOptions, groupIndex: 2 },
        { field: 't55580', label: 'Keberadaan BPD', type: 'radio', options: AdaTidakAdaAktifOptions, groupIndex: 3 },
        { field: 't55581', label: 'Jumlah Anggota BPD', type: 'number', groupIndex: 3 },
        { field: 't55583', label: 'Pendidikan Ketua BPD', type: 'radio', options: PendidikanOptions, groupIndex: 3 },
        { field: 't55583a', label: 'Nama Ketua BPD', type: 'text', groupIndex: 3 },
        { field: 't55583b', label: 'Pelatihan yang pernah diikuti', type: 'textarea', groupIndex: 3 },
        { field: 't55583c', label: 'Jenis Kelamin', type: 'radio', options: JenisKelaminOptions, groupIndex: 3 },
        { field: 't55584', label: 'Pendidikan Wakil Ketua BPD', type: 'radio', options: PendidikanOptions, groupIndex: 3 },
        { field: 't55584a', label: 'Nama Wakil Ketua BPD', type: 'text', groupIndex: 3 },
        { field: 't55585', label: 'Pendidikan Sekretaris BPD', type: 'radio', options: PendidikanOptions, groupIndex: 3 },
        { field: 't55583d', label: 'Nama Sekretaris BPD', type: 'text', groupIndex: 3 },
        { field: 't55586', label: 'Nama Anggota 1', type: 'text', groupIndex: 4 },
        { field: 't55586a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55587', label: 'Nama Anggota 2', type: 'text', groupIndex: 4 },
        { field: 't55587a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55588', label: 'Nama Anggota 3', type: 'text', groupIndex: 4 },
        { field: 't55588a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55589', label: 'Nama Anggota 4', type: 'text', groupIndex: 4 },
        { field: 't55589a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55590', label: 'Nama Anggota 5', type: 'text', groupIndex: 4 },
        { field: 't55590a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55591', label: 'Nama Anggota 6', type: 'text', groupIndex: 4 },
        { field: 't55591a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55592', label: 'Nama Anggota 7', type: 'text', groupIndex: 4 },
        { field: 't55592a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55593', label: 'Nama Anggota 8', type: 'text', groupIndex: 4 },
        { field: 't55593a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55594', label: 'Nama Anggota 9', type: 'text', groupIndex: 4 },
        { field: 't55594a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55595', label: 'Nama Anggota 10', type: 'text', groupIndex: 4 },
        { field: 't55595a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55596', label: 'Nama Anggota 11', type: 'text', groupIndex: 4 },
        { field: 't55596a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55597', label: 'Nama Anggota 12', type: 'text', groupIndex: 4 },
        { field: 't55597a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55598', label: 'Nama Anggota 13', type: 'text', groupIndex: 4 },
        { field: 't55598a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55599', label: 'Nama Anggota 14', type: 'text', groupIndex: 4 },
        { field: 't55599a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 },
        { field: 't55600', label: 'Nama Anggota 15', type: 'text', groupIndex: 4 },
        { field: 't55600a', label: 'Pendidikan', type: 'radio', options: PendidikanOptions, groupIndex: 4 }
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
