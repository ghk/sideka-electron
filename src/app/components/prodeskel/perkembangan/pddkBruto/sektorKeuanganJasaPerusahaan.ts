import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-pddk-bruto-sektor-keuangan-jasa-perusahaan',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPddkBrutoSektorKeuanganJasaPerusahaan extends ProdeskelBase {
    title: string = 'Sektor Keuangan, Persewaan, dan Jasa Perusahaan';
    gridType: string = 'grid_k14';
    formType: string = 'form_k14';

    schemaGroups: string[] = [null, 'Sub-Sektor Bank', 'Sub-Sektor Lembaga Keuangan Bukan Bank', 'Sub-Sektor Sewa Bangunan', 'Sub-Sektor Jasa Perusahaan'];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 0 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 0 },
        { field: "k14101", label: "Jumlah transaksi perbankan (Rp)", type: "number", groupIndex: 1 },
        { field: "k14102", label: "Jumlah nilai transaksi perbankan (Rp)", type: "number", groupIndex: 1 },
        { field: "k14103", label: "Jumlah biaya yang dikeluarkan (Rp)", type: "number", groupIndex: 1 },
        { field: "k14105", label: "Jumlah lembaga keuangan bukan bank (Unit)", type: "number", groupIndex: 2 },
        { field: "k14106", label: "Jumlah kegiatan jasa penunjang lembaga keuangan bukan bank (Jenis)", type: "number", groupIndex: 2 },
        { field: "k14107", label: "Nilai transaksi lembaga keuangan bukan bank (Rp)", type: "number", groupIndex: 2 },
        { field: "k14108", label: "Biaya yang dikeluarkan (Rp)", type: "number", groupIndex: 2 },
        { field: "k14110", label: "Jumlah usaha persewaan bangunan dan tanah (Unit)", type: "number", groupIndex: 3 },
        { field: "k14111", label: "Total nilai persewaan yang dicapai (Rp)", type: "number", groupIndex: 3 },
        { field: "k14112", label: "Biaya yang dikeluarkan (Rp)", type: "number", groupIndex: 3 },
        { field: "k14113", label: "Biaya lainnya (Rp)", type: "number", groupIndex: 3 },
        { field: "k14115", label: "Jumlah perusahaan jasa (Jenis)", type: "number", groupIndex: 4 },
        { field: "k14116", label: "Nilai transaksi perusahaan jasa (Rp)", type: "number", groupIndex: 4 },
        { field: "k14117", label: "Biaya yang dikeluarkan (Rp)", type: "number", groupIndex: 4 },
        { field: "k14118", label: "Biaya lainnya (Rp)", type: "number", groupIndex: 4 }
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
