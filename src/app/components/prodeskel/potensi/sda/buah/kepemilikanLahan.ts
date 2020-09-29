import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../../stores/prodeskelService';
import SettingsService from '../../../../../stores/settingsService';
import { ProdeskelBase } from '../../../base';

@Component({
    selector: 'prodeskel-sda-buah-kepemilikan-lahan',
    templateUrl: '../../../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdaBuahKepemilikanLahan extends ProdeskelBase {
    title: string = 'Kepemilikan Lahan Tanaman Buah-Buahan';
    gridType: string = 'grid_t15';
    formType: string = 'form_t15';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'number', hidden: true, required: true, groupIndex: 0 },
        { field: 't15201', label: 'Memiliki Kurang Dari 10 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't15202', label: 'Memiliki 10 - 50 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't15203', label: 'Memiliki 50 - 100 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't15204', label: 'Memiliki 100 - 500 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't15205', label: 'Memiliki 500 - 1000 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't15206', label: 'Memiliki Lebih Dari 1000 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't15199', label: 'Jumlah Keluarga Memiliki Tanah (KK)', type: 'number', readOnly: true, groupIndex: 1 },
        { field: 't15200', label: 'Jumlah Keluarga Tidak Memiliki Tanah (KK)', type: 'number', groupIndex: 1 },
        { field: 't15207', label: 'Jumlah Keluarga Petani Tanaman Buah-Buahan (KK)', type: 'number', readOnly: true, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let jumlahPemilikTanah = this.sumFloatFields(values, ['t15201', 't15202', 't15203', 't15204', 't15205', 't15206']);
        let jumlahPetani = this.parseFloat(values['t15200']) + this.parseFloat(jumlahPemilikTanah);

        form.controls['t15199'].patchValue(jumlahPemilikTanah, { emitEvent: false });
        form.controls['t15207'].patchValue(jumlahPetani, { emitEvent: false });
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
