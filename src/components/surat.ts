import { Component, ApplicationRef, Input, Output, EventEmitter } from "@angular/core";
import { remote, shell } from "electron";
import { ToastsManager } from 'ng2-toastr';
import { ViewContainerRef } from "@angular/core";

import * as fs from 'fs';
import * as path from 'path';
import * as jetpack from 'fs-jetpack';
import * as uuid from 'uuid';

import schemas from '../schemas';
import createPrintVars from '../helpers/printvars';
import DataApiService from '../stores/dataApiService';

var expressions = require('angular-expressions');
var ImageModule = require('docxtemplater-image-module');
var base64 = require("uuid-base64");
var JSZip = require('jszip');
var Docxtemplater = require('docxtemplater');
var moment = require('moment');
var $ = require('jquery');

const APP = remote.app;
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

@Component({
    selector: 'surat',
    templateUrl: 'templates/surat.html'
})
export default class SuratComponent {
    private _selectedPenduduk;
    private _bundleData;
    private _bundleSchemas;
    private _settings;
    private _hots;

    @Output()
    reloadSurat: EventEmitter<any> = new EventEmitter<any>();

    @Input()
    set selectedPenduduk(value) {
        this._selectedPenduduk = value;
    }
    get selectedPenduduk() {
        return this._selectedPenduduk;
    }

    @Input()
    set bundleSchemas(value) {
        this._settings = value;
    }
    get bundleSchemas() {
        return this._settings;
    }

    @Input()
    set settings(value) {
        this._bundleSchemas = value;
    }
    get settings() {
        return this._bundleSchemas;
    }

    bundleData: any;
    suratCollection: any[];
    filteredSurat: any[];
    selectedSurat: any;
    keywordSurat: string;
    isFormSuratShown: boolean;

    constructor(
        private toastr: ToastsManager, 
        private vcr: ViewContainerRef, 
        private dataApiService: DataApiService) { }

    ngOnInit(): void {
        let dirFile = path.join(__dirname, 'surat_templates');
        let dirs = fs.readdirSync(dirFile);
        
        this.suratCollection = [];

        dirs.forEach(dir => {
            let dirPath = path.join(dirFile, dir, dir + '.json');

            try {
                let jsonFile = JSON.parse(jetpack.read(dirPath));
                this.suratCollection.push(jsonFile);
            }
            catch (ex) {
                console.log('Surat error: ', ex, dirPath);
            }
        });

        this.selectedSurat = {
            "name": null,
            "thumbnail": null,
            "path": null,
            "code": null,
            "data": {}
        };

        this.filteredSurat = this.suratCollection;
        this.bundleData = this.dataApiService.getLocalContent('penduduk', this.bundleSchemas);
    }

    searchSurat(): void {
        this.filteredSurat = this.suratCollection.filter(e => e.title.toLowerCase().indexOf(this.keywordSurat.toLowerCase()) > -1);
    }

    selectSurat(surat): boolean {
        this.selectedSurat = surat;
        this.isFormSuratShown = true;
        return false;
    }

    printSurat(): void {
        if (!this.selectedPenduduk)
            return;

        let dataSettingsDir = path.join(APP.getPath("userData"), "settings.json");
        let dataSettings = {};
        
        if (!jetpack.exists(dataSettingsDir)){
            let dialog = remote.dialog;
            let choice = dialog.showMessageBox(remote.getCurrentWindow(),
            {
                type: 'question',
                buttons: ['Batal', 'Segera Cetak'],
                title: 'Hapus Penyimpanan Offline',
                message: 'Konfigurasi anda belum diisi (nama dan jabatan penyurat serta logo desa), apakah anda mau melanjutkan?'
            });

            if(choice == 0)
                return;
        }
        else{
            dataSettings = JSON.parse(jetpack.read(dataSettingsDir));
        }
        
        let dataSource = this.bundleData.data['penduduk'];
       
        let formData = {};

        this.selectedSurat.forms.forEach(form => {
            if(form.selector_type === 'kk'){
                let keluarga = this.bundleData.data['penduduk'].filter(e => e[22] === form.value);
                formData[form.var] = [];

                keluarga.forEach(k => {
                    let objK = schemas.arrayToObj(k, schemas.penduduk);
                    objK['umur'] = moment().diff(new Date(objK.tanggal_lahir), 'years')
                    formData[form.var].push(objK);
                });
            }
            else{
                formData[form.var] = form.value;
            }
        });
      
        this.selectedPenduduk['umur'] = moment().diff(new Date(this.selectedPenduduk.tanggal_lahir), 'years');

        let docxData = {
            "vars": null,
            "penduduk": this.selectedPenduduk,
            "form": formData,
            "logo": this.convertDataURIToBinary(dataSettings['logo'])
        };

        this.dataApiService.getDesa(false).subscribe(result => {
            docxData.vars = createPrintVars(result);
         
            let form = this.selectedSurat.data;
            let fileId = this.renderSurat(docxData, this.selectedSurat);

            if (!fileId)
                return;

            let data = this.bundleData.data['penduduk'];

            data.push([
                base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                this.selectedSurat.title,
                new Date(),
                fileId
            ]);

            this.reloadSurat.emit(data);
        });
    }

    renderSurat(data, surat): any {
        let fileName = remote.dialog.showSaveDialog({
            filters: [{ name: 'Word document', extensions: ['docx'] }]
        });

        if (!fileName)
            return null;

        if (!fileName.endsWith(".docx"))
            fileName = fileName + ".docx";

        let angularParser = function (tag) {
            var expr = expressions.compile(tag);
            return { get: expr };
        }

        let nullGetter = function (tag, props) {
            return "";
        };

        let opts = {
            "centered": false,
            "getImage": (tagValue) => {
                return tagValue;
            },
            "getSize": (image, tagValue, tagName) => {
                return [100, 100];
            }
        };

        let dirPath = path.join(__dirname, 'surat_templates', surat.code, surat.file);
        let content = fs.readFileSync(dirPath, "binary");
        let imageModule = new ImageModule(opts);
        let zip = new JSZip(content);

        let doc = new Docxtemplater();

        doc.loadZip(zip);
        doc.setOptions({ parser: angularParser, nullGetter: nullGetter });
        doc.attachModule(imageModule);
        doc.setData(data);
        doc.render();

        let buf = doc.getZip().generate({ type: "nodebuffer" });

        fs.writeFileSync(fileName, buf);
        shell.openItem(fileName);

        let localPath = path.join(DATA_DIR, "surat_logs");

        if (!fs.existsSync(localPath))
            fs.mkdirSync(localPath);

        let fileId = base64.encode(uuid.v4()) + '.docx';
        let localFilename = path.join(localPath, fileId);

        this.copySurat(fileName, localFilename, (err) => { });

        return fileId;
    }

    convertDataURIToBinary(base64): any {
        if (!base64)
            return null;

        const string_base64 = base64.replace(/^data:image\/(png|jpg);base64,/, "");
        var binary_string = new Buffer(string_base64, 'base64').toString('binary');

        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            var ascii = binary_string.charCodeAt(i);
            bytes[i] = ascii;
        }
        return bytes.buffer;
    }

    copySurat(source, target, callback) {
        let cbCalled = false;

        let done = (err) => {
            if (!cbCalled) {
                callback(err);
                cbCalled = true;
            }
        }

        let rd = fs.createReadStream(source);

        rd.on('error', (err) => {
            done(err);
        });

        let wr = fs.createWriteStream(target);

        wr.on('error', (err) => {
            done(err);
        });

        rd.pipe(wr);
    }

    pendudukSelected(data, type, selectorType): void {
        let penduduk = this.bundleData.data['penduduk'].filter(e => e[0] === data.id)[0];
        let form = this.selectedSurat.forms.filter(e => e.var === type)[0];

        if(!form)
            return;
        
        form.value = data.id;

        if(selectorType === 'penduduk'){
            form.value = schemas.arrayToObj(penduduk, schemas.penduduk);
            form.value['umur'] = moment().diff(new Date(form.value.tanggal_lahir), 'years');
        }
    }
}
