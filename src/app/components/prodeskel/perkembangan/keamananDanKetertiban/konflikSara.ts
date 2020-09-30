import { Component, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ToastsManager } from 'ng2-toastr';
import ProdeskelService from '../../../../stores/prodeskelService';
import SettingsService from '../../../../stores/settingsService';
import { ProdeskelBase } from '../../base';

@Component({
    selector: 'prodeskel-keamanan-dan-ketertiban-konflik-sara',
    templateUrl: '../../../../templates/prodeskel/base.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export class ProdeskelKeamananDanKetertibanKonflikSara extends ProdeskelBase {
    title: string = 'Konflik SARA';
    gridType: string = 'grid_k34';
    formType: string = 'form_k34';

    schemaGroups: string[] = [null, ' '];
    schemas: { [key: string]: any }[] = [
        { field: "kode_desa", label: "Kode Desa", type: "number", hidden: true, viewHidden: true, groupIndex: 1 },
        { field: "tanggal", label: "Tanggal", type: "date", hidden: true, groupIndex: 1 },
        { field: "k34471", label: "Kasus konflik pada tahun ini", type: "number", groupIndex: 1 },
        { field: "k34472", label: "Kasus konflik SARA pada tahun ini", type: "number", groupIndex: 1 },
        { field: "k34473", label: "Jumlah kasus pertengkaran dan atau perkelahian antar tetangga", type: "number", groupIndex: 1 },
        { field: "k34474", label: "Jumlah kasus pertengkaran dan atau perkelahian antar RT/RW", type: "number", groupIndex: 1 },
        { field: "k34475", label: "Jumlah konflik antar masyarakat pendatang dengan penduduk asli", type: "number", groupIndex: 1 },
        { field: "k34476", label: "Jumlah kasus antar kelompok masyarakat dalam desa/kelurahan dengan kelompok masyarakat dari desa/kelurahan lain", type: "number", groupIndex: 1 },
        { field: "k34477", label: "Jumlah konflik antara masyarakat dengan pemerintah", type: "number", groupIndex: 1 },
        { field: "k34478", label: "Jumlah kerugian material akibat konflik antara masyarakat dan pemerintah", type: "number", groupIndex: 1 },
        { field: "k34479", label: "Jumlah korban jiwa akibat konflik antara masyarakat dengan pemerintah", type: "number", groupIndex: 1 },
        { field: "k34480", label: "Jumlah konflik antara masyarakat dengan perusahaan", type: "number", groupIndex: 1 },
        { field: "k34481", label: "Jumlah korban jiwa akibat konflik antara masyarakat dengan perusahaan", type: "number", groupIndex: 1 },
        { field: "k34482", label: "Jumlah kerugian material akibat konflik antara masyarakat dan pemerintah", type: "number", groupIndex: 1 },
        { field: "k34483", label: "Jumlah konflik politik antara masyarakat dengan lembaga politik", type: "number", groupIndex: 1 },
        { field: "k34484", label: "Jumlah korban jiwa akibat konflik politik antara masyarakat dengan lembaga politik", type: "number", groupIndex: 1 },
        { field: "k34485", label: "Jumlah kerugian material akibat konflik politik antara masyarakat dengan lembaga politik", type: "number", groupIndex: 1 },
        { field: "k34486", label: "Jumlah prasarana dan sarana yang rusak/terbakar akibat konflik Sara", type: "number", groupIndex: 1 },
        { field: "k34487", label: "Jumlah rumah penduduk yang rusak/terbakar akibat konflik Sara", type: "number", groupIndex: 1 },
        { field: "k34488", label: "Jumlah korban luka akibat konflik Sara", type: "number", groupIndex: 1 },
        { field: "k34489", label: "Jumlah korban meninggal akibat konflik Sara", type: "number", groupIndex: 1 },
        { field: "k34490", label: "Jumlah janda akibat konflik Sara", type: "number", groupIndex: 1 },
        { field: "k34491", label: "Jumlah anak yatim akibat konflik Sara", type: "number", groupIndex: 1 },
        { field: "k34492", label: "Jumlah pelaku konflik yang diadili atau diproses secara hukum", type: "number", groupIndex: 1 }
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