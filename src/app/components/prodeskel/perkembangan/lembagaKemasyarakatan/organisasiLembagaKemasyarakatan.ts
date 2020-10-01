import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { LembagaKemasyarakatanJenisOrganisasiOptions, LembagaKemasyarakatanJenisOrganisasiOptions } from '../../options';
import { LembagaKemasyarakatanKepengurusanOptions, LembagaKemasyarakatanKepengurusanOptions } from '../../options';
import { LembagaKemasyarakatanDasarHukumOptions, LembagaKemasyarakatanDasarHukumOptions } from '../../options';

@Component({
    selector: 'prodeskel-lembaga-kemasyarakatan',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelLembagaKemasyarakatan extends ProdeskelBase {
    title: string = 'Organisasi Lembaga Kemasyarakatan';
    gridType: string = 'grid_k35a';
    formType: string = 'form_k35a';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "number", groupIndex: 1 },
        { field: "kode_desa", label: "Kode Desa", type: "number", groupIndex: 1 },
        { field: "k35a1", label: "Jenis Organisasi", type: "radio", options: LembagaKemasyarakatanJenisOrganisasiOptions, groupIndex: 1 },
        { field: "k35a2", label: "Kepengurusan", type: "radio", options: LembagaKemasyarakatanKepengurusanOptions, groupIndex: 1 },
        { field: "k35a3", label: "Buku Administrasi", type: "number", groupIndex: 1 },
        { field: "k35a4", label: "Jumlah kegiatan", type: "number", groupIndex: 1 },
        { field: "k35a5", label: "Dasar Hukum Pembentukan", type: "radio", options: LembagaKemasyarakatanDasarHukumOptions, groupIndex: 1 }
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