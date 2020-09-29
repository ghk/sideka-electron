import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-mataPencaharian-sektor-pertanian',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelMataPencaharianSektorPertanian extends ProdeskelBase {
    title: string = 'Mata Pencaharian Sektor Pertanian';
    gridType: string = 'grid_k20';
    formType: string = 'form_k20';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k20196", label: "Sektor Mata Pencaharian", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "k20197", label: "Petani (Orang)", type: "number", groupIndex: 1 },
        { field: "k20198", label: "Pemilik Usaha Tani (Orang)", type: "number", groupIndex: 1 },
        { field: "k20199", label: "Buruh Tani (Orang)", type: "number", groupIndex: 1 },
        { field: "total", label: "Jumlah (Orang)", type: "number", groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let total = this.sumFloatFields(values, ['k20197', 'k20198', 'k20199']);

        form.controls['total'].patchValue(total, { emitEvent: false });
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
