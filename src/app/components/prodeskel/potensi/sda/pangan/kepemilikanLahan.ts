import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../../stores/prodeskelService';
import SettingsService from '../../../../../stores/settingsService';
import { ProdeskelBase } from '../../../base';

@Component({
    selector: 'prodeskel-sda-pangan-kepemilikan-lahan',
    templateUrl: '../../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdaPanganKepemilikanLahan extends ProdeskelBase {
    title: string = 'Kepemilikan Lahan Tanaman Pangan';
    gridType: string = 'grid_t13';
    formType: string = 'form_t13';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'number', hidden: true, required: true, groupIndex: 0 },
        { field: "t13184", label: "Memiliki Kurang 10 Ha (KK)", type: "number", groupIndex: 1 },
        { field: "t13185", label: "Memiliki 10 - 50 Ha (KK)", type: "number", groupIndex: 1 },
        { field: "t13186", label: "Memiliki 50 - 100 Ha (KK)", type: "number", groupIndex: 1 },
        { field: "t13187", label: "Memiliki Lebih Dari 100 Ha (KK)", type: "number", groupIndex: 1 },
        { field: "t13182", label: "Jumlah Keluarga Memiliki Tanah (KK)", type: "number", readOnly: true, groupIndex: 1 },
        { field: "t13183", label: "Jumlah Keluarga Tidak Memiliki Tanah (KK)", type: "number", groupIndex: 1 },
        { field: "t13188", label: "Jumlah Keluarga Petani Tanaman Pangan (KK)", type: "number", readOnly: true, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let jumlahPemilikTanah = this.sumFloatFields(values, ['t13184', 't13185', 't13186', 't13187']);
        let jumlahPetani = this.parseFloat(values['t13183']) + this.parseFloat(jumlahPemilikTanah);

        form.controls['t13182'].patchValue(jumlahPemilikTanah, { emitEvent: false });
        form.controls['t13188'].patchValue(jumlahPetani, { emitEvent: false });
    }

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
