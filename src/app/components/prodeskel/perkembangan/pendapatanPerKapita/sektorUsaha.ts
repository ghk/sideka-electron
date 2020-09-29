import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { PendapatanPerKapitaSektorUsahaJenisSektorOptions } from '../../options';

@Component({
    selector: 'prodeskel-pendapatan-per-kapita-sektor-usaha',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPendapatanPerKapitaSektorUsaha extends ProdeskelBase {
    title: string = 'Pendapatan per Kapita Menurut Sektor Usaha';
    gridType: string = 'grid_k18';
    formType: string = 'form_k18';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k18179", label: "Jenis Sektor", type: "select", options: PendapatanPerKapitaSektorUsahaJenisSektorOptions, groupIndex: 1 },
        { field: "k18180", label: "Jumlah rumah tangga (KK)", type: "number", groupIndex: 1 },
        { field: "k18181", label: "Jumlah total anggota rumah tangga (Orang)", type: "number", groupIndex: 1 },
        { field: "k18182", label: "Jumlah rumah tangga buruh (KK)", type: "number", groupIndex: 1 },
        { field: "k18183", label: "Jumlah anggota rumah tangga buruh (Orang)", type: "number", groupIndex: 1 },
        { field: "k18184", label: "Jumlah pendapatan perkapita dari sektor tersebut untuk setiap rumah tangga (Rp)", type: "number", groupIndex: 1 }
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
