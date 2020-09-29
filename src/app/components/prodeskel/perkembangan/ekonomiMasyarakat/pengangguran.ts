import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-ekonomi-masyarakat-pengangguran',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelEkonomiMasyarakatPengangguran extends ProdeskelBase {
    title: string = 'Pengangguran';
    gridType: string = 'grid_k02';
    formType: string = 'form_k02';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k02017", label: "Jumlah Angkatan Kerja (penduduk usia 18-56 tahun) (Orang)", type: "number", groupIndex: 1 },
        { field: "k02018", label: "Jumlah penduduk usia 18-56 tahun yang masih sekolah dan tidak bekerja (Orang)", type: "number", groupIndex: 1 },
        { field: "k02019", label: "Jumlah penduduk usia 18-56 tahun yang menjadi ibu rumah tangga (Orang)", type: "number", groupIndex: 1 },
        { field: "k02020", label: "Jumlah penduduk usia 18-56 tahun yang bekerja penuh (Orang)", type: "number", groupIndex: 1 },
        { field: "k02021", label: "Jumlah penduduk usia 18-56 tahun yang bekerja tidak tentu (Orang)", type: "number", groupIndex: 1 },
        { field: "k02022", label: "Jumlah penduduk usia 18-56 tahun yang cacat dan tidak bekerja (Orang)", type: "number", groupIndex: 1 },
        { field: "k02023", label: "Jumlah penduduk usia 18-56 tahun yang cacat dan bekerja (Orang)", type: "number", groupIndex: 1 }
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
