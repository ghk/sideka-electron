import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../stores/prodeskelService';
import SettingsService from '../../../stores/settingsService';
import { ProdeskelBasePotensi } from '../basePotensi';
import { SdaLokasiTanahKasDesaOptions } from '../options';

@Component({
    selector: 'prodeskel-sda-jenis-lahan',
    templateUrl: '../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdaJenisLahan extends ProdeskelBasePotensi {
    title: string = 'Jenis Lahan';
    gridType: string = 'grid_t03';
    formType: string = 'form_t03';

    schemaGroups: string[] = [null, 'Tanah Sawah', 'Tanah Kering', 'Tanah Basah', 'Tanah Perkebunan', 'Tanah Fasilitas Umum', 'Tanah Hutan', 'Ringkasan'];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'date', hidden: true, groupIndex: 0 },
        { field: 't03048', label: 'Sawah Irigasi Teknis (Ha)', type: 'number', groupIndex: 1 },
        { field: 't03049', label: 'Sawah Irigasi 1/2 Teknis (Ha)', type: 'number', groupIndex: 1 },
        { field: 't03050', label: 'Sawah Tadah Hujan (Ha)', type: 'number', groupIndex: 1 },
        { field: 't03051', label: 'Sawah Pasang Surut (Ha)', type: 'number', groupIndex: 1 },
        { field: 't03052', label: 'Luas Tanah Sawah (Ha)', type: 'number', readOnly: true, groupIndex: 1 },
        { field: 't04055', label: 'Tegal/Ladang (Ha)', type: 'number', groupIndex: 2 },
        { field: 't04056', label: 'Pemukiman (Ha)', type: 'number', groupIndex: 2 },
        { field: 't04057', label: 'Pekarangan (Ha)', type: 'number', groupIndex: 2 },
        { field: 't04058', label: 'Luas Tanah Kering (Ha)', type: 'number', readOnly: true, groupIndex: 2 },
        { field: 't05061', label: 'Tanah Rawa (Ha)', type: 'number', groupIndex: 3 },
        { field: 't05062', label: 'Pasang Surut (Ha)', type: 'number', groupIndex: 3 },
        { field: 't05063', label: 'Lahan Gambut (Ha)', type: 'number', groupIndex: 3 },
        { field: 't05064', label: 'Situ/Waduk/Danau (Ha)', type: 'number', groupIndex: 3 },
        { field: 't05065', label: 'Luas Tanah Basah (Ha)', type: 'number', readOnly: true, groupIndex: 3 },
        { field: 't06068', label: 'Perkebunan Rakyat (Ha)', type: 'number', groupIndex: 4 },
        { field: 't06069', label: 'Perkebunan Negara (Ha)', type: 'number', groupIndex: 4 },
        { field: 't06070', label: 'Perkebunan Swasta (Ha)', type: 'number', groupIndex: 4 },
        { field: 't06071', label: 'Perkebunan Perorangan (Ha)', type: 'number', groupIndex: 4 },
        { field: 't06072', label: 'Luas Tanah Perkebunan (Ha)', type: 'number', readOnly: true, groupIndex: 4 },
        { field: 't07076', label: 'Tanah Bengkok (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07077', label: 'Tanah Titi Sara (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07078', label: 'Kebun Desa (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07079', label: 'Sawah Desa (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07075', label: 'Kas Desa/Kelurahan (Ha)', type: 'number', readOnly: true, groupIndex: 5 },
        { field: 't07075a', label: 'Lokasi Tanah Kas Desa', type: 'radio', options: SdaLokasiTanahKasDesaOptions, required: true, groupIndex: 5 },
        { field: 't07080', label: 'Lapangan Olahraga (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07081', label: 'Perkantoran Pemerintah (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07082', label: 'Ruang Publik/Taman Kota (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07083', label: 'Tempat Pemakaman Umum (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07084', label: 'Tempat Pembuangan Sampah (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07085', label: 'Bangunan Sekolah/Perguruan Tinggi (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07086', label: 'Pertokoan (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07087', label: 'Fasilitas Pasar (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07088', label: 'Terminal (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07089', label: 'Jalan (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07090', label: 'Daerah Tangkapan Air (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07091', label: 'Usaha Perikanan (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07092', label: 'Sutet/Aliran Listrik Tegangan Tinggi (Ha)', type: 'number', groupIndex: 5 },
        { field: 't07093', label: 'Luas Tanah Fasilitas Umum (Ha)', type: 'number', readOnly: true, groupIndex: 5 },
        { field: 't08096', label: 'Hutan Lindung (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08098', label: 'a. Hutan Produksi Tetap (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08099', label: 'b. Hutan Produksi Terbatas (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08097', label: 'Hutan Produksi (Ha)', type: 'number', readOnly: true, groupIndex: 6 },
        { field: 't08100', label: 'Hutan Konservasi (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08101', label: 'Hutan Adat (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08102', label: 'Hutan Asli (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08103', label: 'Hutan Sekunder (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08104', label: 'Hutan Buatan (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08105', label: 'Hutan Mangrove (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08107', label: 'a. Suaka Alam (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08108', label: 'b. Suaka Margasatwa (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08106', label: 'Hutan Suaka (Ha)', type: 'number', readOnly: true, groupIndex: 6 },
        { field: 't08109', label: 'Hutan Rakyat (Ha)', type: 'number', groupIndex: 6 },
        { field: 't08110', label: 'Luas Tanah Hutan (Ha)', type: 'number', readOnly: true, groupIndex: 6 },
        { field: 'ringkasan', label: 'Ringkasan', type: 'text', hidden: true, viewHidden: true, groupIndex: 7 },
        { field: 'luas', label: 'Luas Desa/Kelurahan (Ha)', type: 'number', groupIndex: 7 },
        { field: 't03000', label: 'Total Luas Entri Data (Ha)', type: 'number', readOnly: true, groupIndex: 7 },
        { field: 'selisih', label: 'Selisih Luas (Ha)', type: 'number', readOnly: true, groupIndex: 7 }
    ]

    computedFunction = (val: { [key: string]: any }, form: FormGroup) => {
        let values = form.value;

        let luasTanahSawah = this.sumFloatFields(values, ['t03048', 't03049', 't03050', 't03051']);
        let luasTanahKering = this.sumFloatFields(values, ['t04055', 't04056', 't04057']);
        let luasTanahBasah = this.sumFloatFields(values, ['t05061', 't05062', 't05063', 't05064']);
        let luasTanahPerkebunan = this.sumFloatFields(values, ['t06068', 't06069', 't06070', 't06071']);
        let luasKasDesa = this.sumFloatFields(values, ['t07076', 't07077', 't07078', 't07079']);
        let luasTanahFasilitasUmum = this.sumFloatFields(values, ['t07076', 't07077', 't07078', 't07079', 't07080', 't07081', 't07082', 't07083', 't07084', 't07085', 't07086', 't07087', 't07088', 't07089', 't07090', 't07091', 't07092'])
        let luasHutanProduksi = this.sumFloatFields(values, ['t08098', 't08099']);
        let luasHutanSuaka = this.sumFloatFields(values, ['t08107', 't08108']);
        let luasTanahHutan = this.sumFloatFields(values, ['t08096', 't08098', 't08099', 't08100', 't08101', 't08102', 't08103', 't08104', 't08105', 't08107', 't08108', 't08109']);
        let luasDesa = this.parseFloat(values['luas']);
        let totalLuas = this.parseFloat(luasTanahSawah) +
            this.parseFloat(luasTanahKering) +
            this.parseFloat(luasTanahBasah) +
            this.parseFloat(luasTanahPerkebunan) +
            this.parseFloat(luasTanahFasilitasUmum) +
            this.parseFloat(luasTanahHutan);
        let selisih = (luasDesa - totalLuas).toString().replace('.', ',');

        form.controls['t03052'].patchValue(luasTanahSawah, { emitEvent: false });
        form.controls['t04058'].patchValue(luasTanahKering, { emitEvent: false });
        form.controls['t05065'].patchValue(luasTanahBasah, { emitEvent: false });
        form.controls['t06072'].patchValue(luasTanahPerkebunan, { emitEvent: false });
        form.controls['t07075'].patchValue(luasKasDesa, { emitEvent: false });
        form.controls['t07093'].patchValue(luasTanahFasilitasUmum, { emitEvent: false });
        form.controls['t08097'].patchValue(luasHutanProduksi, { emitEvent: false });
        form.controls['t08106'].patchValue(luasHutanSuaka, { emitEvent: false });
        form.controls['t08110'].patchValue(luasTanahHutan, { emitEvent: false });
        form.controls['t03000'].patchValue(totalLuas, { emitEvent: false });
        form.controls['selisih'].patchValue(selisih, { emitEvent: false });
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
