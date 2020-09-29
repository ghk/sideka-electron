import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { KategoriPrasaranaKomunikasiDanInformasiOptions, JenisPrasaranaKomunikasiDanInformasiOptions, SatuanPrasaranaKomunikasiDanInformasiOptions } from '../../options';

@Component({
    selector: 'prodeskel-sarana-prasarana-komunikasi-informasi',
    templateUrl: '../../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSaranaPrasaranaKomunikasiDanInformasi extends ProdeskelBase {
    title: string = 'Prasarana Komunikasi Dan Informasi';
    gridType: string = 'grid_t65';
    formType: string = 'form_t65';

    kategoriValueChanges = (val: string, form: FormGroup) => {
        let kategoriIndex = KategoriPrasaranaKomunikasiDanInformasiOptions.findIndex(cat => cat.value == val);
        let jenisOptions = JenisPrasaranaKomunikasiDanInformasiOptions[kategoriIndex];
        let jenisSchemaIndex = this.schemas.findIndex(schema => schema.field === 't65710');
        this.schemas[jenisSchemaIndex].options = jenisOptions;

        let jenisValue = form.get('t65710').value;
        if (jenisOptions.findIndex(e => e.value == jenisValue) === -1)
            form.get('t65710').patchValue(null);
    }

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'number', hidden: true, required: true, groupIndex: 0 },
        { field: 't65711', label: 'Kategori', type: 'radio', required: true, options: KategoriPrasaranaKomunikasiDanInformasiOptions, valueChanges: this.kategoriValueChanges, groupIndex: 1 },
        { field: 't65710', label: 'Jenis Sarana/Prasarana', type: 'radio', required: true, options: [], groupIndex: 1 },
        { field: 't65712', label: 'Jumlah (Unit)', type: 'number', groupIndex: 1 },
        { field: 't65713', label: 'Satuan', type: 'select', options: SatuanPrasaranaKomunikasiDanInformasiOptions, groupIndex: 1 }
    ];

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
