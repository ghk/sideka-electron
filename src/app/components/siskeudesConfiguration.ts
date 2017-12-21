import { Component, ViewContainerRef, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastsManager } from 'ng2-toastr';
import { remote } from 'electron';

import SiskeudesService from '../stores/siskeudesService';
import SettingsService from '../stores/settingsService';
import { toSiskeudes } from '../stores/siskeudesFieldTransformer';


import * as jetpack from 'fs-jetpack';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as moment from 'moment';

var base64Img = require('base64-img');

@Component({
    selector: 'siskeudes-configuration',
    templateUrl: '../templates/siskeudesConfiguration.html',
})

export default class SiskeudesConfigurationComponent {
    settings: any;
    settingsSubscription: Subscription;
    siskeudesDesas: any;
    isCreateSiskeudesDbShown: boolean;
    model: any;

    constructor(
        private toastr: ToastsManager,
        private vcr: ViewContainerRef,
        private zone: NgZone,
        private siskeudesService: SiskeudesService,
        private settingsService: SettingsService,
    ) {
        this.toastr.setRootViewContainerRef(this.vcr);
    }

    ngOnInit(): void {
        this.settings = {};
        this.model = {};
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
            this.settings = settings; 
        });
        this.readSiskeudesDesa();
    }
    
    ngOnDestroy():void {
        this.settingsSubscription.unsubscribe();
    }

    saveSettings() {
        this.settingsService.setAll(this.settings);
        this.readSiskeudesDesa();
        this.toastr.success('Penyimpanan Berhasil!', '');
    }

    readSiskeudesDesa() {
        if(!this.settings['siskeudes.path'])
            return;

        if (!jetpack.exists(this.settings['siskeudes.path']))
            return;

        this.siskeudesService.getAllDesa(this.settings['siskeudes.path'], data =>{
            if(data instanceof Array === false){
                this.toastr.error('Gagal Membuka Database', '');
                console.error(data);
                return;
            }
            this.zone.run(() => {
                this.siskeudesDesas = data;
                if(this.settings['siskeudes.desaCode'] == '' && this.siskeudesDesas.length){
                    this.settings['siskeudes.desaCode'] = this.siskeudesDesas[0]['Kd_Desa']
                }
            })            
        })
    }
    
    fileChangeEvent(fileInput: any) {
        let file = fileInput.target.files[0];
        let extensionFile = file.name.split('.').pop();

        this.settings['siskeudes.path'] = file.path; 
        this.settings['siskeudes.desaCode'] = '';   
        this.readSiskeudesDesa();
    }

    openCreateDialog(){
        $("#modal-create-db").modal('show');     
    }

    async createNewDb(model){
        let fileName = remote.dialog.showSaveDialog({
            filters: [{name: 'DataAPBDES', extensions: ['mde']}]
        });

        if(fileName){
            $("#modal-create-db").modal('hide');   
            let data = Object.assign({}, model);
            let source = path.join(__dirname, 'assets/DataAPBDES.mde');            
            let siskeudesField = toSiskeudes(this.normalizeModel(data), 'desa');
            let fileNameTemp = moment().unix() +"_"+  path.basename(fileName);
            siskeudesField['fileName'] = fileName;
            
            //check if file is exist
            if(fs.existsSync(fileName)){
                let wr = fs.createWriteStream(path.join(os.tmpdir(), fileNameTemp));
                wr.on("error", err => {
                    return this.toastr.error('Gagal membuat database', '');
                });

                fs.createReadStream(source).pipe(wr).on('finish', ()=>{
                    this.copyAndCreateDB(source, fileName, siskeudesField, data);
                });
            } 
            else {
                this.copyAndCreateDB(source, fileName, siskeudesField, data);
            }          
        }
    }

    copyAndCreateDB(source, fileName, siskeudesField, data){
        //copy file mde
        let wr = fs.createWriteStream(fileName);
        wr.on("error", err => {
            return this.toastr.error('Gagal membuat database', '');
        });
        let copy = fs.createReadStream(source).pipe(wr);           

        //after copy create database
        copy.on('finish', () => {
            this.siskeudesService.createNewDB(siskeudesField, response => {
                if(response instanceof Array === false) {
                    this.toastr.error('Penyimpanan ke Database  Gagal!', '');
                    fs.unlinkSync(fileName);
                    return;
                }
                this.toastr.success(`Buat Database baru berhasil`, '');
                this.settings['siskeudes.desaCode'] = data.kode_desa;
                this.settings['siskeudes.path'] = fileName;
                this.saveSettings();

                $('#form-create-db')[0]['reset']();
            })
        })
    }

    normalizeModel(model): any{
        model.kode_desa = `${model.kode_kecamatan}.${model.kode_desa}.`;
        /*
        model.Nama_Provinsi = `PROVINSI ${model.Nama_Provinsi.toUpperCase()}`;
        model.Nama_Pemda = `PEMERINTAH KABUPATEN ${model.Nama_Pemda.toUpperCase()}`;
        */
        model.nama_kecamatan = `KECAMATAN ${model.nama_kecamatan.toUpperCase()}`;
        model.nama_desa = `PEMERINTAH DESA ${model.nama_desa.toUpperCase()}`;
        return model;
    }

   
}