import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-kependudukan-penduduk-dan-kepala-keluarga',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelKependudukanPendudukDanKepalaKeluarga extends ProdeskelBase {
    title: string = 'Perkembangan Kependudukan';
    gridType: string = 'grid_k01';
    formType: string = 'form_k01';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k01004", label: "Jumlah Penduduk Laki-Laki Tahun ini (Orang)", type: "number", groupIndex: 1 },
        { field: "k01005", label: "Jumlah Penduduk Perempuan Tahun ini (Orang)", type: "number", groupIndex: 1 },
        { field: "k01006", label: "Jumlah Penduduk Laki-Laki Tahun Lalu (Orang)", type: "number", groupIndex: 1 },
        { field: "k01007", label: "Jumlah Penduduk Pereampuan Tahun Lalu (Orang)", type: "number", groupIndex: 1 },
        { field: "k01009", label: "Jumlah Kepala Keluarga (Laki-Laki) Tahun ini (KK)", type: "number", groupIndex: 1 },
        { field: "k01010", label: "Jumlah Kepala Keluarga (Perempuan) Tahun ini (KK)", type: "number", groupIndex: 1 },
        { field: "k01011", label: "Jumlah Kepala Keluarga (Laki-Laki) Tahun Lalu (KK)", type: "number", groupIndex: 1 },
        { field: "k01012", label: "Jumlah Kepala Keluarga (Perempuan) Tahun Lalu (KK)", type: "number", groupIndex: 1 }
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
