import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { SdmAgamaOptions } from '../../options';

@Component({
    selector: 'prodeskel-sdm-agama',
    templateUrl: '../../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdmAgama extends ProdeskelBase {
    title: string = 'Agama';
    gridType: string = 'grid_t49';
    formType: string = 'form_t49';

    agamaValueChanges = async (val: string, form: FormGroup) => {
        this.idRegex = new RegExp('id\\?\\#\\?([0-9]*)\\?\\@\\?tanggal\\?\\#\\?.*\\?\\@\\?kode_desa\\?\\#\\?.*\\?\\@\\?t49510\\?\\#\\?' + val, 'gm');
        await super.fetchLatestData();
        this.existingValues['t49510'] = val;
    }

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 0 },
        { field: "tanggal", label: "Tanggal", type: "number", hidden: true, groupIndex: 0 },
        { field: "t49510", label: "Agama", type: "radio", required: true, options: SdmAgamaOptions, valueChanges: this.agamaValueChanges, groupIndex: 1 },
        { field: "t49511", label: "Laki-Laki (orang)", type: "number", groupIndex: 1 },
        { field: "t49512", label: "Perempuan (orang)", type: "number", groupIndex: 1 },
        { field: "jumlah", label: "Jumlah (Orang)", type: "number", readOnly: true, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let jumlah = this.sumFloatFields(values, ['t49511', 't49512']);
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
