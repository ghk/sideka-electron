import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';
@Component({
    selector: 'prodeskel-pemerintah-desa-dan-kelurahan-anggaran-kelurahan',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelPemerintahDesaDanKelurahanAnggaranKelurahan extends ProdeskelBase {
    title: string = 'APB-Desa dan Anggaran Kelurahan';
    gridType: string = 'grid_k36';
    formType: string = 'form_k36';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k36808", label: "- APBD Kabupaten/Kota (Rp)", type: "number", groupIndex: 1 },
        { field: "k36809", label: "- Bantuan Pemerintah Kabupaten/Kota (Rp)", type: "number", groupIndex: 1 },
        { field: "k36810", label: "- Bantuan Pemerintah Provinsi (Rp)", type: "number", groupIndex: 1 },
        { field: "k36811", label: "- Bantuan Pemerintah Pusat (Rp)", type: "number", groupIndex: 1 },
        { field: "k36812", label: "- Pendapatan Asli Desa (Rp)", type: "number", groupIndex: 1 },
        { field: "k36813", label: "- Swadaya Masyarakat Desa dan Kelurahan (Rp)", type: "number", groupIndex: 1 },
        { field: "k36814", label: "- Alokasi Dana Desa (Rp)", type: "number", groupIndex: 1 },
        { field: "k36815", label: "- Sumber Pendapatan dari Perusahaan yang ada di desa/kelurahan (Rp)", type: "number", groupIndex: 1 },
        { field: "k36816", label: "- Sumber pendapatan lain yang sah dan tidakmengikat (Rp)", type: "number", groupIndex: 1 },
        { field: "k36806", label: "Jumlah Penerimaan Desa/Kelurahan tahun ini (Rp)", type: "number", readOnly:true, groupIndex: 1 },
        { field: "k36817", label: "- Jumlah Belanja Publik/belanja pembangunan (Rp)", type: "number", groupIndex: 1 },
        { field: "k36818", label: "- Jumlah Belanja Aparatur/pegawai (Rp)", type: "number", groupIndex: 1 },
        { field: "belanja", label: "Jumlah Belanja (Rp)", type: "number", readOnly:true, groupIndex: 1 },
        { field: "silpa", label: "Saldo Anggaran (Rp)", type: "number", readOnly:true, groupIndex: 1 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let k36806 = this.sumFloatFields(values, ['k36808', 'k36809', 'k36810', 'k36811', 'k36812', 'k36813', 'k36814', 'k36815', 'k36816']);
        let belanja = this.sumFloatFields(values, ['k36817', 'k36818']);
        let silpa = this.roundFloat(this.parseFloat(k36806) - this.parseFloat(belanja));

        form.controls['k36806'].patchValue(k36806, { emitEvent: false });
        form.controls['belanja'].patchValue(belanja, { emitEvent: false });
        form.controls['silpa'].patchValue(silpa, { emitEvent: false });
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
