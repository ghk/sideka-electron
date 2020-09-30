import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-pddk-bruto-sektor-bangunan-konstruksi',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPddkBrutoSektorBangunanKonstruksi extends ProdeskelBase {
    title: string = 'Sektor Bangunan / Konstruksi';
    gridType: string = 'grid_k13';
    formType: string = 'form_k13';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k13093", label: "Jumlah bangunan yang ada tahun ini (Unit)", type: "number", groupIndex: 1 },
        { field: "k13094", label: "Biaya pemeliharaan yang dikeluarkan (Rp)", type: "number", groupIndex: 1 },
        { field: "k13095", label: "Total nilai bangunan yang ada (Rp)", type: "number", groupIndex: 1 },
        { field: "k13096", label: "Biaya antara lainnya (Rp)", type: "number", groupIndex: 1 }
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
