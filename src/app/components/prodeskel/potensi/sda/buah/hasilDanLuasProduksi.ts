import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../../stores/prodeskelService';
import SettingsService from '../../../../../stores/settingsService';
import { ProdeskelBase } from '../../../base';
import { SdaBuahKomoditasOptions, SdaBuahYaTidakOptions } from '../../../options';

@Component({
    selector: 'prodeskel-sda-buah-hasil-dan-luas-produksi',
    templateUrl: '../../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdaBuahHasilDanLuasProduksi extends ProdeskelBase {
    title: string = 'Hasil dan Luas Produksi Tanaman Buah-Buahan';
    gridType: string = 'grid_t16';
    formType: string = 'form_t16';
    category: string = '';

    komoditasValueChanges = async (val: string, form: FormGroup) => {
        this.category = SdaBuahKomoditasOptions.find(opt => opt.value === val).label;
        await super.fetchLatestData();
        this.existingValues['t16211'] = val;
    }

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'number', hidden: true, required: true, groupIndex: 0 },
        { field: 't16211', label: 'Nama Komoditas', type: 'select', options: SdaBuahKomoditasOptions, valueChanges: this.komoditasValueChanges, groupIndex: 1 },
        { field: 't16212', label: 'Luas Produksi (Ha)', type: 'number', groupIndex: 1 },
        { field: 't16213', label: 'Hasil Produksi (Ton/Ha)', type: 'number', groupIndex: 1 },
        { field: 't16214', label: 'Dijual Langsung Ke Konsumen', type: 'radio', options: SdaBuahYaTidakOptions, groupIndex: 1 },
        { field: 't16215', label: 'Dijual Ke Pasar', type: 'radio', options: SdaBuahYaTidakOptions, groupIndex: 1 },
        { field: 't16216', label: 'Dijual Melalui KUD', type: 'radio', options: SdaBuahYaTidakOptions, groupIndex: 1 },
        { field: 't16217', label: 'Dijual Melalui Tengkulak', type: 'radio', options: SdaBuahYaTidakOptions, groupIndex: 1 },
        { field: 't16218', label: 'Dijual Melalui Pengecer', type: 'radio', options: SdaBuahYaTidakOptions, groupIndex: 1 },
        { field: 't16219', label: 'Dijual Ke Lumbung Desa/Kelurahan', type: 'radio', options: SdaBuahYaTidakOptions, groupIndex: 1 },
        { field: 't16220', label: 'Tidak Dijual', type: 'radio', options: SdaBuahYaTidakOptions, groupIndex: 1 }
    ]

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
        let categoryNodes = $(nodes).find('[id^=id_sc_field_t16211]');
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
