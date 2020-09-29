import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { SdmTingkatPendidikanOptions } from '../../options';

@Component({
    selector: 'prodeskel-sdm-pendidikan',
    templateUrl: '../../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdmPendidikan extends ProdeskelBase {
    title: string = 'Pendidikan';
    gridType: string = 'grid_t47';
    formType: string = 'form_t47';

    tingkatPendidikanValueChanges = async (val: string, form: FormGroup) => {
        this.idRegex = new RegExp('id\\?\\#\\?([0-9]*)\\?\\@\\?tanggal\\?\\#\\?.*\\?\\@\\?kode_desa\\?\\#\\?.*\\?\\@\\?t47498\\?\\#\\?' + val, 'gm');
        await super.fetchLatestData();
        this.existingValues['t47498'] = val;
    }

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 0 },
        { field: "tanggal", label: "Tanggal", type: "number", hidden: true, groupIndex: 0 },
        { field: "t47498", label: "Tingkatan Pendidikan", type: "select", required: true, options: SdmTingkatPendidikanOptions, valueChanges: this.tingkatPendidikanValueChanges, groupIndex: 1 },
        { field: "t47499", label: "Laki-Laki (orang)", type: "number", groupIndex: 1 },
        { field: "t47500", label: "Perempuan (orang)", type: "number", groupIndex: 1 },
        { field: "jumlah", label: "Jumlah (Orang)", type: "number", readOnly: true, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let jumlah = this.sumFloatFields(values, ['t47499', 't47500']);
        form.controls['jumlah'].patchValue(jumlah, { emitEvent: false });
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
