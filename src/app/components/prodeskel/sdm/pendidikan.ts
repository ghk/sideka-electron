import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../stores/prodeskelService';
import SettingsService from '../../../stores/settingsService';
import { ProdeskelBasePotensi } from '../basePotensi';

@Component({
    selector: 'prodeskel-sdm-pendidikan',
    templateUrl: '../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdmPendidikan extends ProdeskelBasePotensi {
    title: string = 'Pendidikan';
    gridType: string = 'grid_t47';
    formType: string = 'form_t47';

    tingkatPendidikanValueChanges = async (val: string, form: FormGroup) => {
        this.idRegex = new RegExp('id\\?\\#\\?([0-9]*)\\?\\@\\?tanggal\\?\\#\\?.*\\?\\@\\?kode_desa\\?\\#\\?.*\\?\\@\\?t47498\\?\\#\\?' + val, 'gm');
        await super.fetchLatestData();
    }

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 0 },
        { field: "tanggal", label: "Tanggal", type: "number", hidden: true, groupIndex: 0 },
        { field: "t47498", label: "Tingkatan Pendidikan", type: "select", options: [{ "label": "Usia 3 - 6 tahun yang belum masuk TK ", "value": "159" }, { "label": "Usia 3 - 6 tahun yang sedang TK/play group ", "value": "160" }, { "label": "Usia 7 - 18 tahun yang tidak pernah sekolah ", "value": "161" }, { "label": "Usia 7 - 18 tahun yang sedang sekolah ", "value": "162" }, { "label": "Usia 18 - 56 tahun tidak pernah sekolah ", "value": "163" }, { "label": "Usia 18 - 56 tahun pernah SD tetapi tidak tamat ", "value": "164" }, { "label": "Usia 12 - 56 tahun tidak tamat SLTP ", "value": "166" }, { "label": "Usia 18 - 56 tahun tidak tamat SLTA ", "value": "167" }, { "label": "Tamat SD/sederajat ", "value": "165" }, { "label": "Tamat SMP/sederajat ", "value": "168" }, { "label": "Tamat SMA/sederajat ", "value": "169" }, { "label": "Tamat D-1/sederajat ", "value": "170" }, { "label": "Tamat D-2/sederajat ", "value": "171" }, { "label": "Tamat D-3/sederajat ", "value": "172" }, { "label": "Tamat S-1/sederajat ", "value": "173" }, { "label": "Tamat S-2/sederajat ", "value": "174" }, { "label": "Tamat S-3/sederajat ", "value": "175" }, { "label": "Tamat SLB A ", "value": "176" }, { "label": "Tamat SLB B ", "value": "177" }, { "label": "Tamat SLB C ", "value": "178" }], valueChanges: this.tingkatPendidikanValueChanges, groupIndex: 1 },
        { field: "t47499", label: "Laki-Laki (orang)", type: "number", groupIndex: 1 },
        { field: "t47500", label: "Perempuan (orang)", type: "number", groupIndex: 1 },
        { field: "jumlah", label: "Jumlah (Orang)", type: "number", groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let jumlah = this.sumFloatFields(values, ['t47499', 't47500']);
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
