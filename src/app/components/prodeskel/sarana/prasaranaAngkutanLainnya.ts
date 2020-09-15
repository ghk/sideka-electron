import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../stores/prodeskelService';
import SettingsService from '../../../stores/settingsService';
import { ProdeskelBasePotensi } from '../basePotensi';
import { JenisPrasaranaAngkutanLainnyaOptions, KategoriPrasaranaAngkutanLainnyaOptions } from '../options';

@Component({
    selector: 'prodeskel-sarana-prasarana-angkutan-lainnya',
    templateUrl: '../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSaranaPrasaranaAngkutanLainnya extends ProdeskelBasePotensi {
    title: string = 'Prasarana / Sarana Transportasi Lainnya';
    gridType: string = 'grid_t64a';
    formType: string = 'form_t64a';

    kategoriValueChanges = (val: string, form: FormGroup) => {
        let kategoriIndex = KategoriPrasaranaAngkutanLainnyaOptions.findIndex(cat => cat.value == val);
        let jenisOptions = JenisPrasaranaAngkutanLainnyaOptions[kategoriIndex];
        let jenisSchemaIndex = this.schemas.findIndex(schema => schema.field === 't64703');
        this.schemas[jenisSchemaIndex].options = jenisOptions;

        let jenisValue = form.get('t64703').value;
        if (jenisOptions.findIndex(e => e.value == jenisValue) === -1)
            form.get('t64703').patchValue(null);
    }

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'number', hidden: true, required: true, groupIndex: 0 },
        { field: 't64704', label: 'Kategori', type: 'radio', required: true, options: KategoriPrasaranaAngkutanLainnyaOptions, valueChanges: this.kategoriValueChanges, groupIndex: 1 },
        { field: 't64703', label: 'Jenis Sarana/Prasarana', type: 'radio', required: true, options: [], groupIndex: 1 },
        { field: 't64705', label: 'Jumlah (Unit)', type: 'number', groupIndex: 1 }
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
