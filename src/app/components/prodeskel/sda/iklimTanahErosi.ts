import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../stores/prodeskelService';
import SettingsService from '../../../stores/settingsService';
import { ProdeskelBasePotensi } from '../basePotensi';

@Component({
    selector: 'prodeskel-sda-iklim-tanah-erosi',
    templateUrl: '../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdaIklimTanahErosi extends ProdeskelBasePotensi {
    title: string = 'Iklim, Tanah, dan Erosi';
    gridType: string = 'grid_t09';
    formType: string = 'form_t09';

    schemaGroups: string[] = [null, 'Iklim', 'Tanah', 'Erosi'];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'number', hidden: true, required: true, groupIndex: 0 },
        { field: 't09113', label: 'Curah Hujan (mm)', type: 'number', groupIndex: 1 },
        { field: 't09114', label: 'Jumlah Bulan Hujan (bulan)', type: 'number', groupIndex: 1 },
        { field: 't09115', label: 'Kelembapan Udara (%)', type: 'number', groupIndex: 1 },
        { field: 't09116', label: 'Suhu Rata-Rata Harian (oC)', type: 'number', groupIndex: 1 },
        { field: 't09117', label: 'Tinggi Diatas Permukaan Laut (M)', type: 'number', groupIndex: 1 },
        { field: 't10121', label: 'Warna Tanah', type: 'radio', options: [{ label: 'Kuning', value: 1 }, { label: 'Hitam', value: 2 }, { label: 'Abu-Abu', value: 3 }, { label: 'Merah', value: 4 }], groupIndex: 2 },
        { field: 't10122', label: 'Tekstur Tanah', type: 'radio', options: [{ label: 'Pasiran', value: 1 }, { label: 'Debuan', value: 2 }, { label: 'Lempungan', value: 3 }], groupIndex: 2 },
        { field: 't10123', label: 'Kemiringan Tanah (derajat)', type: 'number', groupIndex: 2 },
        { field: 't10124', label: 'Lahan Kritis (Ha)', type: 'number', groupIndex: 2 },
        { field: 't10125', label: 'Lahan Terlantar (Ha)', type: 'number', groupIndex: 2 },
        { field: 't11129', label: 'Luas Tanah Erosi Ringan (Ha)', type: 'number', groupIndex: 3 },
        { field: 't11130', label: 'Luas Tanah Erosi Sedang (Ha)', type: 'number', groupIndex: 3 },
        { field: 't11131', label: 'Luas Tanah Erosi Berat (Ha)', type: 'number', groupIndex: 3 },
        { field: 't11132', label: 'Luas Tanah yang Tidak Ada Erosi (Ha)', type: 'number', groupIndex: 3 }
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
