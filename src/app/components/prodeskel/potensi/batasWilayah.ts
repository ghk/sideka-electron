import { ProdeskelBase } from '../base';
import { Component, ViewContainerRef } from '@angular/core';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../stores/prodeskelService';
import SettingsService from '../../../stores/settingsService';

@Component({
    selector: 'prodeskel-batas-wilayah',
    templateUrl: '../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelBatasWilayah extends ProdeskelBase {
    title: string = 'Batas Wilayah';
    formType: string = 'form_t01';
    gridType: string = 'grid_t01';

    schemaGroups: string[] = ['Data Umum', 'Batas Wilayah', 'Penetapan Batas', 'Sumber Data'];
    schemas: { [key:string]: any }[] = [
        { field: 'kode_desa', label: "Kode Desa", type: "text", hidden: true, groupIndex: 0 },
        { field: 'tahun_pembentukan', label: "Tahun Pembentukan", type: "text", required: true, groupIndex: 0 },
        { field: 't01011a', label: "Luas Desa (Ha)", type: "text", groupIndex: 0 },
        { field: 't01011', label: "Nama Kepala Desa/Lurah", type: "text", required: true, groupIndex: 0 },
        { field: 't01008', label: "Nama Pengisi", type: "text", groupIndex: 0 },
        { field: 't01009', label: "Pekerjaan", type: "text", groupIndex: 0 },
        { field: 't01010', label: "Jabatan", type: "text", groupIndex: 0 },
        { field: 'bulan', label: "Bulan", type: "number", required: true, groupIndex: 0 },
        { field: 'tahun', label: "Tahun", type: "number", required: true, groupIndex: 0 },
        { field: 't01018', label: "Desa/Kelurahan Sebelah Utara", type: "text", groupIndex: 1 },
        { field: 't01019', label: "Desa/Kelurahan Sebelah Selatan", type: "text", groupIndex: 1 },
        { field: 't01020', label: "Desa/Kelurahan Sebelah Timur", type: "text", groupIndex: 1 },
        { field: 't01021', label: "Desa/Kelurahan Sebelah Barat", type: "text", groupIndex: 1 },
        { field: 't01022', label: "Kecamatan Sebelah Utara", type: "text", groupIndex: 1 },
        { field: 't01023', label: "Kecamatan Sebelah Selatan", type: "text", groupIndex: 1 },
        { field: 't01024', label: "Kecamatan Sebelah Timur", type: "text", groupIndex: 1 },
        { field: 't01025', label: "Kecamatan Sebelah Barat", type: "text", groupIndex: 1 },
        { field: 't01027', label: "Penetapan Batas", type: "radio", options: [{ label: 'Ada', value: 1}, { label: 'Tidak Ada', value: 0}], groupIndex: 2 },
        { field: 't01028', label: "Dasar Hukum Perdes No.", type: "text", groupIndex: 2 },
        { field: 't01029', label: "Dasar Hukum Perda No.", type: "text", groupIndex: 2 },
        { field: 't01030', label: "Peta Wilayah", type: "radio", options: [{ label: 'Ada', value: 1}, { label: 'Tidak Ada', value: 0}], groupIndex: 2 },
        { field: 't01013', label: "Referensi 1", type: "text", groupIndex: 3 },
        { field: 't01014', label: "Referensi 2", type: "text", groupIndex: 3 },
        { field: 't01015', label: "Referensi 3", type: "text", groupIndex: 3 },
        { field: 't01016', label: "Referensi 4", type: "text", groupIndex: 3 }
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
        this.overrideValues['bulan'] = new Date().getMonth();
        this.overrideValues['tahun'] = new Date().getFullYear();
        this.overrideValues['t01008'] = this.settings['prodeskel.pengisi'];
        this.overrideValues['t01009'] = this.settings['prodeskel.pekerjaan'];
        this.overrideValues['t01010'] = this.settings['prodeskel.jabatan'];
    }
}
