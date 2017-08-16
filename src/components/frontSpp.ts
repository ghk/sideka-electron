import { Component, ViewContainerRef, NgZone } from '@angular/core';
import { ToastsManager } from 'ng2-toastr';

import * as $ from 'jquery';

import SettingsService from '../stores/settingsService';
import SiskeudesService from '../stores/siskeudesService';

const jenisSPP = { UM: 'Panjar', LS: 'Definitif', PBY: 'Pembiayaan' }

@Component({
    selector: 'front-spp',
    templateUrl: 'templates/frontSpp.html',
})

export default class FrontSppComponent {
    siskeudesMessage: string;
    kodeDesa: string;
    postingLogs: any[] = [];
    sppData: any = [];
    model: any = {};

    constructor(
        private zone: NgZone,
        private toastr: ToastsManager,
        private vcr: ViewContainerRef,
        private siskeudesService: SiskeudesService,
        private settingsService: SettingsService
    ) {
        this.toastr.setRootViewContainerRef(this.vcr);
    }

    ngOnInit(): void {
        this.siskeudesMessage = this.siskeudesService.getSiskeudesMessage();
        this.kodeDesa = this.settingsService.get('kodeDesa');
        this.getSPPList();
    }

    getSPPList(): void {
        if (this.siskeudesMessage)
            return; 

        this.zone.run(() => {
            this.siskeudesService.getPostingLog(this.kodeDesa, posting => {
                this.postingLogs = posting;
            })
            this.siskeudesService.getSPP(this.kodeDesa, data => {
                this.sppData = data;
            })
        });
    }

    saveSPP() {
        let table = 'Ta_SPP';
        let isValid = true;
        let contents = [];
        let bundle = {
            insert: [],
            update: [],
            delete: []
        };
        let columns = [
            { name: 'No SPP', field: 'No_SPP' },
            { name: 'Tanggal', field: 'Tgl_SPP' },
            { name: 'Uraian', field: 'Keterangan' },
            { name: 'Jenis SPP', field: 'Jn_SPP' }
        ];

        columns.forEach(c => {
            if (this.model[c.field] == "" || this.model[c.field] == "null" || !this.model[c.field]) {
                this.toastr.error(`Kolom ${c.name} tidak boleh kosong`, '');
                isValid = false;
            }
        });

        let isExistSPP = (this.sppData.find(c => c.No_SPP == this.model.No_SPP)) ? true : false;

        if (isExistSPP) {
            this.toastr.error(`No SPP ini sudah Ada`, '');
            isValid = false;
        }

        if (isValid) {
            this.model.Tgl_SPP = moment(this.model.Tgl_SPP, "YYYY-MM-DD").format("DD/MM/YYYY");
            let data = Object.assign({}, this.model, { Potongan: 0, Jumlah: 0, Status: 1, Kd_Desa: this.kodeDesa });

            this.siskeudesService.getTaDesa(this.kodeDesa, response => {
                let desa = response[0];

                data['Tahun'] = desa.Tahun;
                bundle.insert.push({
                    [table]: Object.assign({}, this.model, data)
                });

                this.siskeudesService.saveToSiskeudesDB(bundle, null, response => {
                    if (response.length === 0) {
                        this.toastr.success('Penyimpanan Berhasil!', '');
                        this.getSPPList();
                        $("#modal-add-spp")['modal']("hide");
                    }
                    else
                        this.toastr.error('Penyimpanan Gagal!', '');
                });
            })
        }
    }

    openDialog() {
        this.model = {};
        if (this.postingLogs.length === 0)
            return;

        this.siskeudesService.getMaxNoSPP(this.kodeDesa, data => {
            let pad = '0000';
            let result;

            if (data.length !== 0) {
                let splitCode = data[0].No_SPP.split('/');
                let lastNumber = splitCode[0];
                let newNumber = (parseInt(lastNumber) + 1).toString();
                let stringNum = pad.substring(0, pad.length - newNumber.length) + newNumber;
                this.model.No_SPP = stringNum + '/' + splitCode.slice(1).join('/');
            }

        });

        $("#modal-add-spp")['modal']("show");
    }
}