import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-pddk-bruto-sektor-perdagangan-hotel-dan-restoran',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPddkBrutoSektorPerdaganganHotelDanRestoran extends ProdeskelBase {
    title: string = 'Sektor Perdagangan, Hotel, dan Restoran';
    gridType: string = 'grid_k12';
    formType: string = 'form_k12';

    schemaGroups: string[] = [null, 'Sub-Sektor Perdagangan Besar', 'Sub-Sektor Perdagangan Kecil', 'Sub-Sektor Hotel', 'Sub-Sektor Restoran'];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 0 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 0 },
        { field: "k12071", label: "Total jumlah jenis perdagangan besar (Jenis)", type: "number", groupIndex: 1 },
        { field: "k12069", label: "Total nilai transaksi (Rp)", type: "number", groupIndex: 1 },
        { field: "k12070", label: "Total nilai aset perdagangan yang ada (Rp)", type: "number", groupIndex: 1 },
        { field: "k12072", label: "Total nilai biaya yang dikeluarkan (Rp)", type: "number", groupIndex: 1 },
        { field: "k12073", label: "Total biaya antara lainnya (Rp)", type: "number", groupIndex: 1 },
        { field: "k12075", label: "Jumlah total jenis perdagangan eceran (Jenis)", type: "number", groupIndex: 2 },
        { field: "k12076", label: "Total nilai transaksi (Rp)", type: "number", groupIndex: 2 },
        { field: "k12077", label: "Total nilai biaya yang dikeluarkan (Rp)", type: "number", groupIndex: 2 },
        { field: "k12078", label: "Total nilai aset perdagangan eceran (Rp)", type: "number", groupIndex: 2 },
        { field: "k12080", label: "Jumlah total penginapan dan penyediaan akomodasi yang ada (Jenis)", type: "number", groupIndex: 3 },
        { field: "k12081", label: "Jumlah total pendapatan (Rp)", type: "number", groupIndex: 3 },
        { field: "k12082", label: "Jumlah total biaya pemeliharaan (Rp)", type: "number", groupIndex: 3 },
        { field: "k12083", label: "Jumlah biaya antara yang dikeluarkan (Rp)", type: "number", groupIndex: 3 },
        { field: "k12084", label: "Jumlah total pendapatan yang diperoleh (Rp)", type: "number", groupIndex: 3 },
        { field: "k12086", label: "Jumlah tempat penyediaan konsumsi (Unit)", type: "number", groupIndex: 4 },
        { field: "k12087", label: "Biaya konsumsi yang dikeluarkan (Rp)", type: "number", groupIndex: 4 },
        { field: "k12088", label: "Biaya antara lainnya (Rp)", type: "number", groupIndex: 4 },
        { field: "k12089", label: "Jumlah total pendapatan yang diperoleh (Rp)", type: "number", groupIndex: 4 }
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
