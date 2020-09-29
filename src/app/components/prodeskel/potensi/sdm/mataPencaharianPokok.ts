import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { SdmJenisPekerjaanOptions } from '../../options';

@Component({
    selector: 'prodeskel-sdm-mata-pencaharian-pokok',
    templateUrl: '../../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdmMataPencaharianPokok extends ProdeskelBase {
    title: string = 'Mata Pencaharian Pokok';
    gridType: string = 'grid_t48';
    formType: string = 'form_t48';

    jenisPekerjaanValueChanges = async (val: string, form: FormGroup) => {
        this.idRegex = new RegExp('id\\?\\#\\?([0-9]*)\\?\\@\\?tanggal\\?\\#\\?.*\\?\\@\\?kode_desa\\?\\#\\?.*\\?\\@\\?t48504\\?\\#\\?' + val, 'gm');
        await super.fetchLatestData();
        this.existingValues['t48504'] = val;
    }

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 0 },
        { field: "tanggal", label: "Tanggal", type: "number", hidden: true, groupIndex: 0 },
        { field: "t48504", label: "Jenis Pekerjaan", type: "select", required: true, options: SdmJenisPekerjaanOptions, valueChanges: this.jenisPekerjaanValueChanges, groupIndex: 1 },
        { field: "t48505", label: "Laki-Laki (orang)", type: "number", groupIndex: 1 },
        { field: "t48506", label: "Perempuan (orang)", type: "number", groupIndex: 1 },
        { field: "jumlah", label: "Jumlah (Orang)", type: "number", readOnly: true, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let jumlah = this.sumFloatFields(values, ['t48505', 't48506']);
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
