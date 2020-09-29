import { Component, ViewContainerRef } from '@angular/core';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { JenisLembagaKemasyarakatanOptions, DasarHukumPembentukanKemasyarakatanOptions } from '../../options';

@Component({
    selector: 'prodeskel-kelembagaan-lembaga-kemasyarakatan',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelKelembagaanLembagaKemasyarakatan extends ProdeskelBase {
    title: string = 'Lembaga Kemasyarakatan';
    gridType: string = 'grid_t56';
    formType: string = 'form_t56';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 0 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 0 },
        { field: "t56596", label: "Jenis Lembaga", type: "select", options: JenisLembagaKemasyarakatanOptions, groupIndex: 1 },
        { field: "t56597", label: "Jumlah", type: "number", groupIndex: 1 },
        { field: "t56598", label: "Dasar Hukum Pembentukan", type: "select", options: DasarHukumPembentukanKemasyarakatanOptions, groupIndex: 1 },
        { field: "t56599", label: "Jumlah Pengurus (orang)", type: "number", groupIndex: 1 },
        { field: "t56600", label: "Alamat Kantor", type: "textarea", groupIndex: 1 },
        { field: "t56601", label: "Jumlah Jenis Kegiatan", type: "number", groupIndex: 1 },
        { field: "t56601a", label: "Ruang Lingkup Kegiatan", type: "textarea", groupIndex: 1 }
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
