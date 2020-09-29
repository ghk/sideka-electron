import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../../stores/prodeskelService';
import SettingsService from '../../../../../stores/settingsService';
import { ProdeskelBase } from '../../../base';
import { SdaPanganKomoditasOptions } from '../../../options';

@Component({
    selector: 'prodeskel-sda-pangan-hasil-dan-luas-produksi',
    templateUrl: '../../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdaPanganHasilDanLuasProduksi extends ProdeskelBase {
    title: string = 'Hasil dan Luas Produksi Tanaman Pangan';
    gridType: string = 'grid_t14';
    formType: string = 'form_t14';
    category: string = '';

    komoditasValueChanges = async (val: string, form: FormGroup) => {
        this.category = SdaPanganKomoditasOptions.find(opt => opt.value === val).label;
        await super.fetchLatestData();
        this.existingValues['t14192'] = val;
    }

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'number', hidden: true, required: true, groupIndex: 0 },
        { field: 't14192', label: 'Nama Komoditas', type: 'select', options: SdaPanganKomoditasOptions, valueChanges: this.komoditasValueChanges, groupIndex: 1 },
        { field: 't14193', label: 'Luas Produksi (Ha)', type: 'number', groupIndex: 1 },
        { field: 't14194', label: 'Hasil Produksi (Ton/Ha)', type: 'number', groupIndex: 1 },
        { field: 't14191', label: 'Harga Lokal (Rp/Ton)', type: 'number', groupIndex: 1 },
        { field: 't14194a', label: '1. Nilai Produksi Tahun Ini (Rp)', type: 'number', readOnly: true, groupIndex: 1 },
        { field: 't14194b', label: '2. Biaya Pemupukan (Rp)', type: 'number', groupIndex: 1 },
        { field: 't14194c', label: '3. Biaya Bibit (Rp)', type: 'number', groupIndex: 1 },
        { field: 't14194d', label: '4. Biaya Obat (Rp)', type: 'number', groupIndex: 1 },
        { field: 't14194e', label: '5. Biaya Lainnya (Rp)', type: 'number', groupIndex: 1 },
        { field: 'saldo', label: 'Saldo Produksi (Rp)', type: 'number', readOnly: true, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let nilaiProduksi = this.parseFloat(values['t14193']) * this.parseFloat(values['t14194']) * this.parseFloat(values['t14191']);
        let saldo = nilaiProduksi - this.parseFloat(values['t14194b']) - this.parseFloat(values['t14194c']) - this.parseFloat(values['t14194d']) - this.parseFloat(values['t14194e']);

        form.controls['t14194a'].patchValue(nilaiProduksi, { emitEvent: false });
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
        let categoryNodes = $(nodes).find('[id^=id_sc_field_t14192]');
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
