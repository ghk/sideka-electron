import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-kesehatan-masyarakat-kualitas-ibu-hamil',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelKesehatanMasyarakatKualitasIbuHamil extends ProdeskelBase {
    title: string = 'Kualitas Ibu Hamil';
    gridType: string = 'grid_k29';
    formType: string = 'form_k29';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k29328", label: "Jumlah ibu hamil (Orang)", type: "number", groupIndex: 1 },
        { field: "k29329", label: "Jumlah ibu hamil periksa di Posyandu (Orang)", type: "number", groupIndex: 1 },
        { field: "k29330", label: "Jumlah ibu hamil periksa di Puskesmas (Orang)", type: "number", groupIndex: 1 },
        { field: "k29331", label: "Jumlah ibu hamil periksa di Rumah Sakit (Orang)", type: "number", groupIndex: 1 },
        { field: "k29332", label: "Jumlah ibu hamil periksa di Dokter Praktek (Orang)", type: "number", groupIndex: 1 },
        { field: "k29333", label: "Jumlah ibu hamil periksa di Bidan Praktek (Orang)", type: "number", groupIndex: 1 },
        { field: "k29334", label: "Jumlah ibu hamil periksa di Dukun Terlatih (Orang)", type: "number", groupIndex: 1 },
        { field: "k29335", label: "Jumlah kematian ibu hamil (Orang)", type: "number", groupIndex: 1 },
        { field: "k29336", label: "Jumlah ibu hamil melahirkan (Orang)", type: "number", groupIndex: 1 },
        { field: "k29337", label: "Jumlah ibu nifas (Orang)", type: "number", groupIndex: 1 },
        { field: "k29338", label: "Jumlah kematian ibu nifas (Orang)", type: "number", groupIndex: 1 },
        { field: "k29339", label: "Jumlah ibu nifas hidup (Orang)", type: "number", groupIndex: 1 }
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
