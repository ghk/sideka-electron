import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-pendidikan-masyarakat-tingkat-pendidikan-masyarakat',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPendidikanMasyarakatTingkatPendidikanMasyarakat extends ProdeskelBase {
    title: string = 'Tingkat Pendidikan Masyarakat';
    gridType: string = 'grid_k28';
    formType: string = 'form_k28';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k28264", label: "Jumlah penduduk buta aksara dan huruf latin (Orang)", type: "number", groupIndex: 1 },
        { field: "k28265", label: "Jumlah penduduk usia 3-6 tahun yang masuk TK dan Kelompok Bermain Anak (Orang)", type: "number", groupIndex: 1 },
        { field: "k28266", label: "Jumlah anak dan penduduk cacat fisik dan mental (Orang)", type: "number", groupIndex: 1 },
        { field: "k28267", label: "Jumlah penduduk sedang SD/sederajat (Orang)", type: "number", groupIndex: 1 },
        { field: "k28268", label: "Jumlah penduduk tamat SD/sederajat (Orang)", type: "number", groupIndex: 1 },
        { field: "k28269", label: "Jumlah penduduk tidak tamat SD/sederajat (Orang)", type: "number", groupIndex: 1 },
        { field: "k28270", label: "Jumlah penduduk sedang SLTP/sederajat (Orang)", type: "number", groupIndex: 1 },
        { field: "k28271", label: "Jumlah penduduk tamat SLTP/sederajat (Orang)", type: "number", groupIndex: 1 },
        { field: "k28272", label: "Jumlah penduduk sedang SLTA/sederajat (Orang)", type: "number", groupIndex: 1 },
        { field: "k28273", label: "Jumlah penduduk tidak tamat SLTP/Sederajat (Orang)", type: "number", groupIndex: 1 },
        { field: "k28274", label: "Jumlah penduduk tamat SLTA/Sederajat (Orang)", type: "number", groupIndex: 1 },
        { field: "k28275", label: "Jumlah penduduk sedang D-1 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28276", label: "Jumlah penduduk tamat D-1 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28277", label: "Jumlah penduduk sedang D-2 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28278", label: "Jumlah penduduk tamat D-2 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28279", label: "Jumlah penduduk sedang D-3 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28280", label: "Jumlah penduduk tamat D-3 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28281", label: "Jumlah penduduk sedang S-1 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28282", label: "Jumlah penduduk tamat S-1 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28283", label: "Jumlah penduduk sedang S-2 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28284", label: "Jumlah penduduk tamat S-2 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28285", label: "Jumlah penduduk tamat S-3 (Orang)", type: "number", groupIndex: 1 },
        { field: "k28286", label: "Jumlah penduduk sedang SLB A (Orang)", type: "number", groupIndex: 1 },
        { field: "k28287", label: "Jumlah penduduk tamat SLB A (Orang)", type: "number", groupIndex: 1 },
        { field: "k28288", label: "Jumlah penduduk sedang SLB B (Orang)", type: "number", groupIndex: 1 },
        { field: "k28289", label: "Jumlah penduduk tamat SLB B (Orang)", type: "number", groupIndex: 1 },
        { field: "k28290", label: "Jumlah penduduk sedang SLB C (Orang)", type: "number", groupIndex: 1 },
        { field: "k28291", label: "Jumlah penduduk tamat SLB C (Orang)", type: "number", groupIndex: 1 },
        { field: "k28292", label: "Jumlah penduduk cacat fisik dan mental (Orang)", type: "number", groupIndex: 1 },
        { field: "k28293", label: "Jumlah Penduduk buta huruf  (%)", type: "number", groupIndex: 1 },
        { field: "k28294", label: "Jumlah Penduduk tamat SLTP/sederajat (%)", type: "number", groupIndex: 1 }
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
