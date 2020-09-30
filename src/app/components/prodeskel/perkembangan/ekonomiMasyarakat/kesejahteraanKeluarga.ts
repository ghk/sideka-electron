import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-ekonomi-masyarakat-kesejahteraan-keluarga',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelEkonomiMasyarakatKesejahteraanKeluarga extends ProdeskelBase {
    title: string = 'Kesejahteraan Keluarga';
    gridType: string = 'grid_k03';
    formType: string = 'form_k03';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k03027", label: "Jumlah Keluarga Prasejahtera (KK)", type: "number", groupIndex: 1 },
        { field: "k03028", label: "Jumlah Keluarga Sejahtera 1 (KK)", type: "number", groupIndex: 1 },
        { field: "k03029", label: "Jumlah Keluarga Sejahtera 2 (KK)", type: "number", groupIndex: 1 },
        { field: "k03030", label: "Jumlah Keluarga Sejahtera 3 (KK)", type: "number", groupIndex: 1 },
        { field: "k03031", label: "Jumlah Keluarga Sejahtera 3+ (KK)", type: "number", groupIndex: 1 }
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
