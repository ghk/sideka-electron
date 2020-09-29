import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
import { KategoriPrasaranaTransportasiDaratOptions, JenisPrasaranaTransportasiDaratOptions }  from '../../options';

@Component({
    selector: 'prodeskel-sarana-prasarana-transportasi-darat',
    templateUrl: '../../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSaranaPrasaranaTransportasiDarat extends ProdeskelBase {
    title: string = 'Prasarana Transportasi Darat';
    gridType: string = 'grid_t64';
    formType: string = 'form_t64';

    kategoriValueChanges = (val: string, form: FormGroup) => {
        let kategoriIndex = KategoriPrasaranaTransportasiDaratOptions.findIndex(cat => cat.value == val);
        let jenisOptions = JenisPrasaranaTransportasiDaratOptions[kategoriIndex];
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
        { field: 't64704', label: 'Kategori', type: 'radio', required: true, options: KategoriPrasaranaTransportasiDaratOptions, valueChanges: this.kategoriValueChanges, groupIndex: 1 },
        { field: 't64703', label: 'Jenis Sarana/Prasarana', type: 'radio', options: [], groupIndex: 1 },
        { field: 't64705', label: 'Kondisi Baik', type: 'number', groupIndex: 1 },
        { field: 't64706', label: 'Kondisi Rusak', type: 'number', groupIndex: 1 },
        { field: 'jumlah', label: 'Jumlah (KM / Unit)', type: 'number', readOnly: true, groupIndex: 1 }
    ];

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let jumlah = this.sumFloatFields(values, ['t64705', 't64706']);

        form.controls['jumlah'].patchValue(jumlah, { emitEvent: false });
    }

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
