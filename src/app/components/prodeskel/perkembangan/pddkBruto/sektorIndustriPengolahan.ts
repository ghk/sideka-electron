import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { PddkBrutoSektorIndustriPengolahanOptions } from '../../options';

@Component({
    selector: 'prodeskel-pddk-bruto-sektor-industri-pengolahan',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPddkBrutoSektorIndustriPengolahan extends ProdeskelBase {
    title: string = 'Sektor Industri Pengolahan';
    gridType: string = 'grid_k10';
    formType: string = 'form_k10';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k10052", label: "Jenis Industri Pengolahan", type: "radio", options: PddkBrutoSektorIndustriPengolahanOptions, required: true, groupIndex: 1 },
        { field: "k10053", label: "Total nilai produksi (Rp)", type: "number", groupIndex: 1 },
        { field: "k10054", label: "Total nilai bahan baku yang digunakan (Rp)", type: "number", groupIndex: 1 },
        { field: "k10055", label: "Total nilai bahan penolong yang digunakan (Rp)", type: "number", groupIndex: 1 },
        { field: "k10056", label: "Total biaya antara yang dihabiskan (Rp)", type: "number", groupIndex: 1 },
        { field: "k10057", label: "Total jumlah jenis industri tsb yang ada (Jenis)", type: "number", groupIndex: 1 }
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
