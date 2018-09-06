import { Component, ViewContainerRef, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { remote } from 'electron';

import { SiskeudesService } from '../stores/siskeudesService';
import { SettingsService } from '../stores/settingsService';
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

export class SiskeudesConfigurationComponent {
    settings: any;
    settingsSubscription: Subscription;
    siskeudesDesas: any;
    isCreateSiskeudesDbShown: boolean;
    isErrorDatabase: boolean;
    errorMessage: string;
    model: any;    
    currentSettings:any;
    _activeDatabase: any = null;   
    listSiskeudesDb:any[] = [];
    
    set activeDatabase(value){
        this._activeDatabase = value;       
    }

    get activeDatabase(){
        return this._activeDatabase;
    }

    constructor(
        private toastr: ToastrService,
        private vcr: ViewContainerRef,
        private zone: NgZone,
        private siskeudesService: SiskeudesService,
        private settingsService: SettingsService,
    ) {
    }

    ngOnInit(): void {
        this.settings = {};
        this.model = {};
        this.currentSettings = {};
        this.settingsSubscription = this.settingsService.getAll().subscribe(settings => {
             this.settings = settings; 
             this.listSiskeudesDb = this.settingsService.getListSiskeudesDb();
        });
    }
    
    ngOnDestroy():void {
        this.settingsSubscription.unsubscribe();
    }

    saveSettings() {    
        let content = {
            [this.activeDatabase['year']+".path"]: this.activeDatabase['path'],
            'siskeudes.desaCode': this.activeDatabase['desaCode'],
            'siskeudes.autoSync': this.settings['siskeudes.autoSync']
        }

        if(!this.activeDatabase['desaCode'] || this.activeDatabase['desaCode'] == ""){
            this.toastr.error('harap pilih desa','');            
            return;
        }
        
        if(this.settings['siskeudes.desaCode'] && this.settings['siskeudes.desaCode']  !== this.activeDatabase['desaCode']){
            this.toastr.error('tidak bisa menyimpan dikarenakan desa tidak sesuai dengan database sebelumnya','');            
            return;
        }

        if(this.activeDatabase['status'] == 'create'){
            let years = this.listSiskeudesDb.map(c => c.year);
            if(years.indexOf(this.activeDatabase['year']) !== -1){
                this.toastr.error(`database untuk tahun ${this.activeDatabase['year']} sudah ditambahkan`,'');            
                return;
            }
        }

        if(this.activeDatabase['status'] == 'edit'){
            if(this.activeDatabase['yearSelected'] != this.activeDatabase['year']){
                let years = this.listSiskeudesDb.map(c => c.year);
                if(years.indexOf(this.activeDatabase['year']) !== -1){
                    this.toastr.error(`database untuk tahun ${this.activeDatabase['year']} sudah ditambahkan`,'');            
                    return;
                }
            }
        }

        this.toastr.success('Penyimpanan Berhasil!', '');
        this.settingsService.setAll(content);
        this.activeDatabase = null;        
    }

    readSiskeudesDesa() {
        if(!this.activeDatabase['path'])
            return;

        if (!jetpack.exists(this.activeDatabase['path']))
            return;
        
            this.siskeudesService.getAllDesa(this.activeDatabase['path'], data =>{
                this.isErrorDatabase = false;
                
                if(data instanceof Array === false){                  
                    this.isErrorDatabase = true;

                    let errorReporting = data.toLowerCase();
                    if(errorReporting.search('cscript error') !== -1){
                        this.errorMessage = `database tidak bisa dibuka karena CScript diblock oleh antivirus yang anda gunakan,
                                    silahkan meng-enable atau mengijinkan menu CScript pada antivirus yang anda gunakan.`;                        
                    }
                    else {
                        this.errorMessage = `gagal membuka database`;                        
                    }
                    console.error(data);
                    return;
                } else {
                    this.zone.run(() => {
                        this.siskeudesDesas = data;
                        this.activeDatabase['year'] = this.siskeudesDesas[0]['Tahun'];
                        if(this.activeDatabase['desaCode'] == '' && this.siskeudesDesas.length){
                            this.activeDatabase['desaCode'] = this.siskeudesDesas[0]['Kd_Desa'];
                        }
                        
                    })       
                }     
            })
    }
    
    onchangeDatabase(fileInput: any) {
        let file = fileInput.target.files[0];
        let extensionFile = file.name.split('.').pop();

        this.activeDatabase['path'] = file.path; 
        this.activeDatabase['desaCode'] = '';  
        this.activeDatabase['year']=''; 
        this.readSiskeudesDesa();
    }

    openCreateDialog(){
        $("#modal-create-db")['modal']('show');     
    }

    async createNewDb(model){
        let fileName = remote.dialog.showSaveDialog({
            filters: [{name: 'DataAPBDES', extensions: ['mde']}]
        });

        if(fileName){
            $("#modal-create-db")['modal']('hide');   
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
                this.activeDatabase['desaCode'] = data.kode_desa;
                this.activeDatabase['path'] = fileName;
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

    addNewDatabase(){
        this.activeDatabase = {
            year: null,
            path:"",
            status:'create'
        };
    }

    selectDatabase(db){
        this.activeDatabase = db;
        this.activeDatabase['desaCode'] = this.settings['siskeudes.desaCode'];        
        this.activeDatabase['autoSync'] = this.settings['siskeudes.autoSync'];
        this.activeDatabase['status'] = 'edit';
        this.activeDatabase['yearSelected'] = db.year;
        this.readSiskeudesDesa();        
    }
}