import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-pddk-bruto-sektor-pertambangan-dan-galian',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPddkBrutoSektorPertambanganDanGalian extends ProdeskelBase {
    title: string = 'Sektor Pertambangan Dan Galian';
    gridType: string = 'grid_k08';
    formType: string = 'form_k08';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k08036", label: "Total nilai produksi tahun ini (Rp)", type: "number", groupIndex: 1 },
        { field: "k08037", label: "Total nilai bahan baku yang digunakan (Rp)", type: "number", groupIndex: 1 },
        { field: "k08038", label: "Total nilai bahan penolong yang digunakan (Rp)", type: "number", groupIndex: 1 },
        { field: "k08039", label: "Total biaya antara yang dihabiskan (Rp)", type: "number", groupIndex: 1 },
        { field: "k08040", label: "Jumlah total jenis bahan tambang dan galian yang ada (Buah)", type: "number", groupIndex: 1 }
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
