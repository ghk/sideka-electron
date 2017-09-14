import { Component, ViewContainerRef, NgZone } from '@angular/core';
import { ToastsManager } from 'ng2-toastr';
import { Subscription } from 'rxjs';

import SettingsService from '../stores/settingsService';
import SiskeudesService from '../stores/siskeudesService';

import * as $ from 'jquery';

@Component({
    selector: 'front-spp',
    templateUrl: 'templates/frontSpp.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})

export default class FrontSppComponent {
    jenisSPP = { UM: 'Panjar', LS: 'Definitif', PBY: 'Pembiayaan' };
    settingsSubscription: Subscription;
    siskeudesMessage: string;
    postingLogs: any[] = [];
    sppData: any = [];
    model: any = {};    
    desa: any = {};
    kodeDesa: string;

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
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => { 
            this.kodeDesa = settings.kodeDesa;
            this.siskeudesService.getTaDesa(settings.kodeDesa, response => {
                this.desa = response[0];    
                this.getSPPList();            
            })            
        }); 
    }

    ngOnDestroy(): void {
        this.settingsSubscription.unsubscribe();
    }

    getSPPList(): void {
        if (this.siskeudesMessage != "")
            return; 
        
        this.siskeudesService.getPostingLog(this.kodeDesa, posting => {
            this.postingLogs = posting;
            
            this.siskeudesService.getSPP(this.kodeDesa, data => {
                this.zone.run(() => {
                    this.sppData = data;
                });
            })
        })        
    }

    validateForm(model): boolean {        
        let isValid = true;        
        let columns = [
            { name: 'No SPP', field: 'No_SPP' },
            { name: 'Tanggal', field: 'Tgl_SPP' },
            { name: 'Uraian', field: 'Keterangan' },
            { name: 'Jenis SPP', field: 'Jn_SPP' }
        ];

        columns.forEach(c => {
            if (model[c.field] == "" || model[c.field] == "null" || !model[c.field]) {
                this.toastr.error(`Kolom ${c.name} tidak boleh kosong`, '');
                isValid = false;
            }
        });

        return isValid
    }

    saveSPP() {
        let table = 'Ta_SPP';
        let contents = [];
        let bundle = {
            insert: [],
            update: [],
            delete: []
        };
        let isValid = this.validateForm(this.model);
        let isExistSPP = this.sppData.find(c => c.No_SPP == this.model.No_SPP);

        if (isExistSPP) {
            this.toastr.error(`No SPP ini sudah Ada`, '');
            isValid = false;
        }

        if (isValid) {
            let data = Object.assign({}, this.model, { Potongan: 0, Jumlah: 0, Status: 1, Kd_Desa: this.kodeDesa });

            data['Tahun'] = this.desa.Tahun;
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
        }
    }

    openDialog() {
        this.model = {};
              
        if (this.postingLogs.length === 0)
            return;

        $("#modal-add-spp").modal("show");
        this.siskeudesService.getMaxNoSPP(this.kodeDesa, data => {
            let pad = '0000';
            let result;

            if(!data[0].No_SPP){
                result = `0001/SPP/${this.desa.Kd_Desa.slice(0,-1)}/${this.desa.Tahun}`
            }
            else {
                let splitCode = data[0].No_SPP.split('/');
                let lastNumber = splitCode[0];
                let newNumber = (parseInt(lastNumber) + 1).toString();
                let stringNum = pad.substring(0, pad.length - newNumber.length) + newNumber;
                result = stringNum + '/' + splitCode.slice(1).join('/');
                            
            }
            this.zone.run(() => {
                this.model.No_SPP = result;
            })    
        });
    }
}