import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../stores/prodeskelService';
import SettingsService from '../../../stores/settingsService';
import { ProdeskelBasePotensi } from '../basePotensi';

@Component({
    selector: 'prodeskel-sdm-jumlah',
    templateUrl: '../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdmJumlah extends ProdeskelBasePotensi {
    title: string = 'Jumlah Sumber Daya Manusia';
    gridType: string = 'grid_t45';
    formType: string = 'form_t45';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 0 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 0 },
        { field: "t45484", label: "Jumlah Laki-Laki (orang)", type: "number", groupIndex: 1 },
        { field: "t45485", label: "Jumlah Perempuan (orang)", type: "number", groupIndex: 1 },
        { field: "t45486", label: "Jumlah Total (orang)", type: "number", readOnly: true, groupIndex: 1 },
        { field: "t45487", label: "Jumlah Kepala Keluarga (KK)", type: "number", groupIndex: 1 },
        { field: "luas", label: "Luas Desa (Ha)", type: "number", groupIndex: 1 },
        { field: "t45488", label: "Kepadatan Penduduk (Jiwa/Km2)", type: "number", readOnly: true, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let jumlahPenduduk = this.sumFloatFields(values, ['t45484', 't45485']);
        let kepadatanPenduduk = Math.floor(this.parseFloat(jumlahPenduduk) / (this.parseFloat(values['luas']) / 100));

        form.controls['t45486'].patchValue(jumlahPenduduk, { emitEvent: false });
        form.controls['t45488'].patchValue(kepadatanPenduduk, { emitEvent: false });
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
