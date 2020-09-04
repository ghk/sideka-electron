import { Component, ViewContainerRef } from '@angular/core';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../stores/prodeskelService';
import SettingsService from '../../../stores/settingsService';
import { ProdeskelBasePotensi } from '../basePotensi';

@Component({
    selector: 'prodeskel-sda-topografi',
    templateUrl: '../../../templates/prodeskel/potensi.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelSdaTopografi extends ProdeskelBasePotensi {
    title: string = 'Topografi';
    gridType: string = 'grid_t12';
    formType: string = 'form_t12';

    schemaGroups: string[] = [null, 'Bentangan Wilayah', 'Letak Wilayah', 'Orbitasi'];
    schemas: { [key: string]: any }[] = [
        { field: 'kode_desa', label: 'Kode Desa', type: 'number', hidden: true, viewHidden: true, groupIndex: 0 },
        { field: 'tanggal', label: 'Tanggal', type: 'number', hidden: true, groupIndex: 0 },
        { field: 't12136', label: 'Desa/Kelurahan Dataran Rendah (Ha)', type: 'number', groupIndex: 1 },
        { field: 't12137', label: 'Desa/Kelurahan Berbukit-Bukit (Ha)', type: 'number', groupIndex: 1 },
        { field: 't12138', label: 'Desa/Kelurahan Dataran (Ha)', type: 'number', groupIndex: 1 },
        { field: 't12139', label: 'Desa/Kelurahan Lereng Gunung (Ha)', type: 'number', groupIndex: 1 },
        { field: 't12140', label: 'Desa/Kelurahan Tepi Pantai/Pesisir (Ha)', type: 'number', groupIndex: 1 },
        { field: 't12141', label: 'Desa/Kelurahan Kawasan Rawa (Ha)', type: 'number', groupIndex: 1 },
        { field: 't12142', label: 'Desa/Kelurahan Kawasan Gambut (Ha)', type: 'number', groupIndex: 1 },
        { field: 't12143', label: 'Desa/Kelurahan Aliran Sungai (Ha)', type: 'number', groupIndex: 1 },
        { field: 't12144', label: 'Desa/Kelurahan Bantaran Sungai (Ha)', type: 'number', groupIndex: 1 },
        { field: 't12145', label: 'Lain-Lain (Ha)', type: 'number', groupIndex: 1 },
        { field: 't12147', label: 'Desa/Kelurahan Kawasan Perkantoran (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12148', label: 'Desa/Kelurahan Kawasan Pertokoan (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12149', label: 'Desa/Kelurahan Kawasan Campuran (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12150', label: 'Desa/Kelurahan Kawasan Industri (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12151', label: 'Desa/Kelurahan Kepulauan (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12152', label: 'Desa/Kelurahan Pantai/Pesisir (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12153', label: 'Desa/Kelurahan Kawasan Hutan (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12154', label: 'Desa/Kelurahan Taman Suaka (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12155', label: 'Desa/Kelurahan Kawasan Wisata (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12156', label: 'Desa/Kelurahan Perbatasan Dengan Negara Lain (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12157', label: 'Desa/Kelurahan Perbatasan Dengan Provinsi Lain (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12158', label: 'Desa/Kelurahan Perbatasan Dengan Kabupaten/Kota Lain (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12159', label: 'Desa/Kelurahan Perbatasan Antar Kecamatan Lain (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12160', label: 'Desa/Kelurahan DAS/Bantaran Sungai (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12161', label: 'Desa/Kelurahan Rawan Banjir (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12162', label: 'Desa/Kelurahan Bebas Banjir (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12163', label: 'Desa/Kelurahan Potensial Tsunami (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12164', label: 'Desa/Kelurahan Rawan Jalur Gempa (Ha)', type: 'number', groupIndex: 2 },
        { field: 't12166', label: 'Jarak Ke Ibu Kota Kecamatan (Km)', type: 'number', groupIndex: 3 },
        { field: 't12167', label: 'Lama Jarak Tempuh Ke Ibu Kota Kecamatan dengan Kendaraan Bermotor (Jam)', type: 'number', groupIndex: 3 },
        { field: 't12168', label: 'Lama Jarak Tempuh Ke Ibu Kota Kecamatan dengan Berjalan Kaki/Kendaraan Non Bermotor (Jam)', type: 'number', groupIndex: 3 },
        { field: 't12169', label: 'Kendaraan Umum Ke Ibu Kota Kecamatan (Unit)', type: 'number', groupIndex: 3 },
        { field: 't12170', label: 'Jarak Ke Ibu Kota Kabupaten/Kota (Km)', type: 'number', groupIndex: 3 },
        { field: 't12171', label: 'Lama Jarak Tempuh Ke Ibu Kota Kabupaten/Kota dengan Kendaraan Bermotor (Jam)', type: 'number', groupIndex: 3 },
        { field: 't12172', label: 'Lama Jarak Tempuh Ke Ibu Kota Kabupaten/Kota dengan Berjalan Kaki/Kendaraan Non Bermotor (Jam)', type: 'number', groupIndex: 3 },
        { field: 't12173', label: 'Kendaraan Umum Ke Ibu Kota Kabupaten/Kota (Unit)', type: 'number', groupIndex: 3 },
        { field: 't12174', label: 'Jarak Ke Ibu Kota Provinsi (Km)', type: 'number', groupIndex: 3 },
        { field: 't12175', label: 'Lama Jarak Tempuh Ke Ibu Kota Provinsi dengan Kendaraan Bermotor (Jam)', type: 'number', groupIndex: 3 },
        { field: 't12176', label: 'Lama Jarak Tempuh Ke Ibu Kota Provinsi dengan Berjalan Kaki/Kendaraan Non Bermotor (Jam)', type: 'number', groupIndex: 3 },
        { field: 't12177', label: 'Kendaraan Umum Ke Ibu Kota Provinsi (Unit)', type: 'number', groupIndex: 3 }
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
