import { remote } from 'electron';
import { Component, NgZone, ViewContainerRef, Input, Output, EventEmitter } from '@angular/core';
import { ToastsManager } from 'ng2-toastr';

import SiskeudesService from '../stores/siskeudesService';
import SharedService from '../stores/sharedService';

import * as path from 'path';
import * as fs from 'fs';


@Component({
    selector: 'create-siskeudes-db',
    templateUrl: '../templates/createSiskeudesDb.html',
})

export default class CreateSiskeudesDbComponent {
    model: any;
    kodeDesa: any;
    siskeudesPath: any;

    constructor(
        private zone: NgZone,
        private sharedService: SharedService,
        private toastr: ToastsManager,
        private siskeudesService: SiskeudesService

    ) {

    }

    
    @Input()
    set showForm(value) {
        this.model = {};
        $('#modal-create-siskeudes-db').modal('show');
    }

    get showForm() {
        return 
    }

    @Output()
    hideForm: EventEmitter<any> = new EventEmitter<any>();

    @Output()
    responseSave: EventEmitter<any> = new EventEmitter<any>();

    ngOnInit() {
        this.model = {};        
    }
    
    closeForm(){
        $('#modal-create-siskeudes-db').modal('hide');
        this.hideForm.emit(false)
    }

    validateForm(model): boolean{
        let requiredFields = ['Kd_Desa', 'Nama_Desa', 'Tahun', 'fileName']; //'Kd_Prov', 'Nama_Provinsi','Kd_Kab','Nama_Pemda', 'Kd_Kec', 'Nama_Kecamatan',
        let aliases = { fileName: 'Lokasi Penyimpanan' };
        let isValidForm = true;

        requiredFields.forEach(c => {
            if (!model[c] || model[c] == '') {
                if (aliases[c])
                    c = aliases[c];
                this.toastr.error(`Kolom ${c} harus di isi`);
                isValidForm = false;
            }
        });
        return isValidForm
    }

    openSaveLocationDialog(){
        let fileName = remote.dialog.showSaveDialog({
            filters: [{name: 'DataAPBDES', extensions: ['mde','mdb']}]
        });

        if(fileName){
            this.model.fileName = fileName;             
        }
    }

    createNewDB(model) {
        let res = false;
        let fileNameSource = 'DataAPBDES.mde';
        let source = path.join(__dirname, fileNameSource);
        let isValidForm = this.validateForm(model);        

        if (!isValidForm)
            return;

        //copy file mde
        let wr = fs.createWriteStream(model.fileName);
        wr.on("error", err => {
            return this.toastr.error('Gagal membuat database', '');
        });
        let copy = fs.createReadStream(source).pipe(wr);

        $("#modal-createDB")['modal']("hide");

        //NORMALIZE model
        model.Kd_Desa = `${model.Kd_Kec}.${model.Kd_Desa}.`;
        /*
        model.Nama_Provinsi = `PROVINSI ${model.Nama_Provinsi.toUpperCase()}`;
        model.Nama_Pemda = `PEMERINTAH KABUPATEN ${model.Nama_Pemda.toUpperCase()}`;
        */
        model.Nama_Kecamatan = `KECAMATAN ${model.Nama_Kecamatan.toUpperCase()}`;
        model.Nama_Desa = `KECAMATAN ${model.Nama_Desa.toUpperCase()}`;

        //after copy create database
        copy.on('finish', () => {
            this.siskeudesService.createNewDB(model, response => {
                //if response = [] response success
                let results = { status: false, kodeDesa: model.Kd_Desa, path: model.fileName }
                if (Array.isArray(response) && response.length == 0) {
                    this.toastr.success(`Buat Database baru berhasil`, '');
                    this.kodeDesa = model.Kd_Desa;
                    this.siskeudesPath = model.fileName;
                    results.status = true;
                    this.responseSave.emit(results)
                }
                else {
                    this.toastr.error(`Buat Database baru gagal`, '');
                    fs.unlinkSync(model.fileName);
                    this.responseSave.emit(results);
                }
                this.closeForm();
            })
        })
    }
}