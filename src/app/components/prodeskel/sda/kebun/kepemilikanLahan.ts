import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBasePotensi } from '../../basePotensi';

@Component({
    selector: 'prodeskel-sda-kebun-kepemilikan-lahan',
    templateUrl: '../../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdaKebunKepemilikanLahan extends ProdeskelBasePotensi {
    title: string = 'Kepemilikan Lahan Tanaman Perkebunan';
    gridType: string = 'grid_t18';
    formType: string = 'form_t18';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'number', hidden: true, required: true, groupIndex: 0 },
        { field: 't18233', label: 'Memiliki Kurang Dari 5 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't18234', label: 'Memiliki 10 - 50 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't18235', label: 'Memiliki 50 - 100 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't18236', label: 'Memiliki 100 - 500 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't18237', label: 'Memiliki 500 - 1000 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't18238', label: 'Memiliki Lebih Dari 1000 Ha (KK)', type: 'number', groupIndex: 1 },
        { field: 't18231', label: 'Jumlah Keluarga Memiliki Tanah (KK)', type: 'number', readOnly: true, groupIndex: 1 },
        { field: 't18232', label: 'Jumlah Keluarga Tidak Memiliki Tanah (KK)', type: 'number', groupIndex: 1 },
        { field: 't18239', label: 'Jumlah Keluarga Petani Tanaman Perkebunan (KK)', type: 'number', readOnly: true, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let jumlahPemilikTanah = this.sumFloatFields(values, ['t18233', 't18234', 't18235', 't18236', 't18237', 't18238']);
        let jumlahPetani = this.parseFloat(values['t18232']) + this.parseFloat(jumlahPemilikTanah);

        form.controls['t18231'].patchValue(jumlahPemilikTanah, { emitEvent: false });
        form.controls['t18239'].patchValue(jumlahPetani, { emitEvent: false });
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
