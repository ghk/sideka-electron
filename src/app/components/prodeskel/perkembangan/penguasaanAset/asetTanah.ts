import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-penguasaan-aset-aset-tanah',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPenguasaanAsetAsetTanah extends ProdeskelBase {
    title: string = 'Penguasaan Aset Tanah';
    gridType: string = 'grid_k21';
    formType: string = 'form_k21';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k21202", label: "Tidak Memiliki Tanah (Orang)", type: "number", groupIndex: 1 },
        { field: "k21203", label: "Memiliki Tanah kurang dari 0,2 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21204", label: "Memiliki Tanah antara 0,21-0,3 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21205", label: "Memiliki Tanah antara 0,31-0,4 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21206", label: "Memiliki Tanah antara 0,41-0,5 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21207", label: "Memiliki Tanah antara 0,51-0,6 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21208", label: "Memiliki Tanah antara 0,61-0,7 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21209", label: "Memiliki Tanah antara 0,71-0,8 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21210", label: "Memiliki Tanah antara 0,81-0,9 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21211", label: "Memiliki Tanah antara 0,91-1,0 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21212", label: "Memiliki Tanah antara 1,00- 5,0 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21213", label: "memiliki Tanah antara 5,00-10 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21214", label: "Memiliki Tanah lebih dari 10 Ha (Orang)", type: "number", groupIndex: 1 },
        { field: "k21215", label: "Jumlah Total Penduduk (Orang)", type: "number", readOnly: true, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let total = this.sumFloatFields(values, ["k21202", "k21203", "k21204", "k21205", "k21206", "k21207", "k21208", "k21209", "k21210", "k21211", "k21212", "k21213", "k21214"]);

        form.controls["k21215"].patchValue(total, { emitEvent: false });
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
