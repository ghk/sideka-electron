import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBasePotensi } from '../../basePotensi';
import { SdaKebunKomoditasOptions, SdaKebunYaTidakOptions } from '../../options';

@Component({
    selector: 'prodeskel-sda-kebun-hasil-dan-luas-produksi',
    templateUrl: '../../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdaKebunHasilDanLuasProduksi extends ProdeskelBasePotensi {
    title: string = 'Hasil dan Luas Produksi Tanaman Perkebunan';
    gridType: string = 'grid_t19';
    formType: string = 'form_t19';
    category: string = '';

    komoditasValueChanges = async (val: string, form: FormGroup) => {
        this.category = SdaKebunKomoditasOptions.find(opt => opt.value === val).label;
        await super.fetchLatestData();
        this.existingValues['t19245'] = val;
    }

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'number', hidden: true, required: true, groupIndex: 0 },
        { field: 't19245', label: 'Nama Komoditas', type: 'select', options: SdaKebunKomoditasOptions, valueChanges: this.komoditasValueChanges, groupIndex: 1 },
        { field: 't19246', label: 'Luas Perkebunan Swasta/Negara (Ha)', type: 'number', groupIndex: 1 },
        { field: 't19247', label: 'Hasil Perkebunan Swasta/Negara (Ton/Ha)', type: 'number', groupIndex: 1 },
        { field: 't19248', label: 'Luas Perkebunan Rakyat (Ha)', type: 'number', groupIndex: 1 },
        { field: 't19249', label: 'Hasil Perkebunan Rakyat (Ton/Ha)', type: 'number', groupIndex: 1 },
        { field: 't19244', label: 'Harga Lokal (Rp/Ton)', type: 'number', groupIndex: 1 },
        { field: 't19249a', label: '1. Nilai Produksi Tahun Ini (Rp)', type: 'number', groupIndex: 1 },
        { field: 't19249b', label: '2. Biaya Pemupukan (Rp)', type: 'number', groupIndex: 1 },
        { field: 't19249c', label: '3. Biaya Bibit (Rp)', type: 'number', groupIndex: 1 },
        { field: 't19249d', label: '4. Biaya Obat (Rp)', type: 'number', groupIndex: 1 },
        { field: 't19249e', label: '5. Biaya Lainnya (Rp)', type: 'number', groupIndex: 1 },
        { field: 'saldo', label: 'Saldo Produksi (Rp)', type: 'number', groupIndex: 1 },
        { field: 't19250', label: 'Dijual Langsung Ke Konsumen', type: 'radio', options: SdaKebunYaTidakOptions, groupIndex: 1 },
        { field: 't19252', label: 'Dijual Melalui KUD', type: 'radio', options: SdaKebunYaTidakOptions, groupIndex: 1 },
        { field: 't19253', label: 'Dijual Melalui Tengkulak', type: 'radio', options: SdaKebunYaTidakOptions, groupIndex: 1 },
        { field: 't19254', label: 'Dijual Melalui Pengecer', type: 'radio', options: SdaKebunYaTidakOptions, groupIndex: 1 },
        { field: 't19255', label: 'Dijual Ke Lumbung Desa/Kelurahan', type: 'radio', options: SdaKebunYaTidakOptions, groupIndex: 1 },
        { field: 't19256', label: 'Tidak Dijual', type: 'radio', options: SdaKebunYaTidakOptions, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let nilaiProduksiRakyat = this.parseFloat(values['t19248']) * this.parseFloat(values['t19249']) * this.parseFloat(values['t19244']);
        let nilaiProduksiSwasta = this.parseFloat(values['t19246']) * this.parseFloat(values['t19247']) * this.parseFloat(values['t19244']);
        let nilaiProduksi = nilaiProduksiRakyat + nilaiProduksiSwasta;

        let saldo = nilaiProduksi - this.parseFloat(values['t19249b']) - this.parseFloat(values['t19249c']) - this.parseFloat(values['t19249d']) - this.parseFloat(values['t19249e']);

        form.controls['t19249a'].patchValue(nilaiProduksi, { emitEvent: false });
        form.controls['saldo'].patchValue(saldo, { emitEvent: false });
    }
    constructor(
        toastr: ToastsManager,
        vcr: ViewContainerRef,
        prodeskelService: ProdeskelService,
        settingsService: SettingsService,
    ) {
        super(toastr, vcr, prodeskelService, settingsService);
    }

    getLatestId(list: string): string {
        let nodes = $.parseHTML(list);
        let categoryNodes = $(nodes).find('[id^=id_sc_field_t19245]');
        if (categoryNodes.length === 0)
            return null;

        for (let i = 0; i < categoryNodes.length; i++) {
            let categoryNode = $(categoryNodes[i]);
            if (categoryNode.html() === this.category) {
                let idHtml = $(categoryNode.parent().siblings()[0]).html();

                let idRegex = new RegExp(/id\?\#\?([0-9]*)\?/gm);
                idRegex.lastIndex = 0;
                let match = idRegex.exec(idHtml);

                let dateRegex = new RegExp(/tanggal\?\#\?(.*)\?\@\?kode_desa/gm);
                dateRegex.lastIndex = 0;
                let dateMatch = dateRegex.exec(idHtml);

                let id = match ? match[1] : null;
                let date = dateMatch ? dateMatch[1] : null;
                this.params = "id?#?" + id + "?@?tanggal?#?" + date + "?@?kode_desa?#?" + this.regCode;

                return id;
            }
        }

        return null;
    }

    setOverrideValues(): void {
        let date = new Date();
        this.overrideValues['tanggal'] = this.encodeDate(date);
    }
}
