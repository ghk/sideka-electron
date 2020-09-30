import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-pddk-bruto-subsektor-kehutanan',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPddkBrutoSubsektorKehutanan extends ProdeskelBase {
    title: string = 'Subsektor Kehutanan';
    gridType: string = 'grid_k11';
    formType: string = 'form_k11';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k11061", label: "Total nilai produksi (Rp)", type: "number", groupIndex: 1 },
        { field: "k11062", label: "Total nilai bahan baku yang digunakan (Rp)", type: "number", groupIndex: 1 },
        { field: "k11063", label: "Total nilai bahan penolong yang digunakan (Rp)", type: "number", groupIndex: 1 },
        { field: "k11064", label: "Total biaya antara yang dihabiskan (Rp)", type: "number", groupIndex: 1 }
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
