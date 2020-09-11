import { Component, ViewContainerRef } from '@angular/core';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../stores/prodeskelService';
import SettingsService from '../../../stores/settingsService';
import { ProdeskelBasePotensi } from '../basePotensi';
import { JenisLembagaKemasyarakatanOptions, DasarHukumPembentukanKemasyarakatanOptions, JenisPemilihanOptions } from '../options';
import { FormGroup } from '@angular/forms';

@Component({
    selector: 'prodeskel-kelembagaan-partisipasi-politik',
    templateUrl: '../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelKelembagaanPartisipasiPolitik extends ProdeskelBasePotensi {
    title: string = 'PartisipasiPolitik';
    gridType: string = 'grid_t56a';
    formType: string = 'form_t56a';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 0 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 0 },
        { field: "t56a1", label: "Jenis Pemilihan", type: "radio", options: JenisPemilihanOptions, groupIndex: 1 },
        { field: "t56a2", label: "Jumlah Wanita Yang Memiliki Hak", type: "number", groupIndex: 1 },
        { field: "t56a3", label: "Jumlah Pria Yang Memiliki Hak Pilih", type: "number", groupIndex: 1 },
        { field: "jpemilih", label: "Jumlah Pemilih (Orang)", type: "number", groupIndex: 1 },
        { field: "t56a4", label: "Jumlah Wanita Yang Memilih", type: "number", groupIndex: 1 },
        { field: "t56a5", label: "Jumlah Pria Yang Memilih", type: "number", groupIndex: 1 },
        { field: "partisipasi", label: "Jumlah Penggunaan Hak Pilih (Orang)", type: "number", groupIndex: 1 },
        { field: "tpart", label: "Persentase", type: "number", "groupIndex": 1 }
    ]

    constructor(
        toastr: ToastsManager,
        vcr: ViewContainerRef,
        prodeskelService: ProdeskelService,
        settingsService: SettingsService,
    ) {
        super(toastr, vcr, prodeskelService, settingsService);
    }

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let jumlahPemilih = this.sumFloatFields(values, ['t56a2', 't56a3']);
        let jumlahPenggunaanHak = this.sumFloatFields(values, ['t56a4', 't56a5']);
        let percentage = this.roundFloat((this.parseFloat(jumlahPenggunaanHak) / this.parseFloat(jumlahPemilih) * 100));

        form.controls['jpemilih'].patchValue(jumlahPemilih, { emitEvent: false });
        form.controls['partisipasi'].patchValue(jumlahPenggunaanHak, { emitEvent: false });
        form.controls['tpart'].patchValue(percentage, { emitEvent: false });
    }

    setOverrideValues(): void {
        let date = new Date();
        this.overrideValues['tanggal'] = this.encodeDate(date);
    }
}
