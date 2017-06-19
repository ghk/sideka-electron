import { Component, ApplicationRef, Input } from "@angular/core";
import { remote, shell } from "electron";
import * as fs from 'fs';
import * as path from 'path';
import * as jetpack from 'fs-jetpack';
import schemas from '../schemas';
import dataApi from "../stores/dataApi";
import createPrintVars from '../helpers/printvars';
import * as uuid from 'uuid';

var expressions = require('angular-expressions');
var ImageModule = require('docxtemplater-image-module');
var base64 = require("uuid-base64");
var JSZip = require('jszip');
var Docxtemplater = require('docxtemplater');
var moment = require('moment');

const APP = remote.app;
const DATA_DIR = APP.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

@Component({
    selector: 'surat',
    templateUrl: 'templates/surat.html'
})
export default class SuratComponent{
    private _selectedPenduduk;
    private _bundleData;
    private _bundleSchemas;
    private _settings;
    private _hot;

    @Input()
    set selectedPenduduk(value){
        this._selectedPenduduk = value;
    }
    get selectedPenduduk(){
        return this._selectedPenduduk;
    }

    @Input()
    set bundleData(value){
        this._bundleData = value;
    }
    get bundleData(){
        return this._bundleData;
    }

    @Input()
    set bundleSchemas(value){
        this._settings = value;
    }
    get bundleSchemas(){
        return this._settings;
    }

    @Input()
    set settings(value){
        this._bundleSchemas = value;
    }
    get settings(){
        return this._bundleSchemas;
    }

    @Input()
    set hot(value){
        this._hot = value;
    }
    get hot(){
        return this._hot;
    }

    suratCollection: any[];
    filteredSurat: any[];
    selectedSurat: any;
    keywordSurat: string;
    isFormSuratShown: boolean;

    constructor(){}

    ngOnInit(): void {
        let dirs = fs.readdirSync('surat_templates');

        this.suratCollection = [];

        dirs.forEach(dir => {
            let jsonFile = JSON.parse(jetpack.read('surat_templates/' + dir + '/' + dir + '.json'));
            this.suratCollection.push(jsonFile);
        });

         this.selectedSurat = {
            "name": null,
            "thumbnail": null,
            "path": null,
            "code": null,
            "data": {}
        };

        this.filteredSurat = this.suratCollection;
    }

    selectSurat(surat): boolean {
        this.selectedSurat = surat;
        this.isFormSuratShown = true;
        return false;
    }

    printSurat(): void {
        if(!this.selectedPenduduk)
            return;
        
        let dataSettingsDir = path.join(APP.getPath("userData"), "settings.json");

        if(!jetpack.exists(dataSettingsDir))
            return;
        
        let dataSettings = JSON.parse(jetpack.read(dataSettingsDir));
        let dataSource = this.hot.getSourceData();
        let keluargaRaw: any[] = dataSource.filter(e => e['22'] === this.selectedPenduduk.no_kk)[0];
        let keluargaResult: any[] = [];

        let penduduksRaw: any[] = dataSource.filter(e => e['22'] === this.selectedPenduduk.no_kk);
        let penduduks: any[] = [];

        keluargaResult = schemas.arrayToObj(keluargaRaw, schemas.keluarga);

        for(let i=0; i<penduduksRaw.length; i++){
            var objRes = schemas.arrayToObj(penduduksRaw[i], schemas.penduduk);
            objRes['no'] = (i + 1);
            penduduks.push(objRes);
        }

        let formData = {};

        for(let i=0; i<this.selectedSurat.forms.length; i++)
            formData[this.selectedSurat.forms[i]["var"]] = this.selectedSurat.forms[i]["value"];
        
        this.selectedPenduduk['umur'] = moment().diff(new Date(this.selectedPenduduk.tanggal_lahir), 'years');

        let docxData = { "vars": null, 
                "penduduk": this.selectedPenduduk, 
                "form": formData,  
                "logo": this.convertDataURIToBinary(dataSettings.logo), 
                "keluarga": keluargaResult, 
                "penduduks": penduduks};  

        dataApi.getDesa(desas => {
            let auth = dataApi.getActiveAuth();
            let desa = desas.filter(d => d.blog_id == auth['desa_id'])[0];
            let printvars = createPrintVars(desa);
            docxData.vars = printvars;
            
            let form = this.selectedSurat.data;
            let fileId = this.renderSurat(docxData, this.selectedSurat);
            let jsonData = JSON.parse(jetpack.read(path.join(CONTENT_DIR, 'penduduk.json')));
            let data = jsonData['data'];

            if(!data['logSurat'])
                data['logSurat'] = [];

            data['logSurat'].push([
                base64.encode(uuid.v4()),
                this.selectedPenduduk.nik,
                this.selectedPenduduk.nama_penduduk,
                this.selectedSurat.title,
                new Date(),
                fileId
            ]);

            this.bundleData['logSurat'] = data['logSurat'];

            dataApi.saveContent('logSurat', null, this.bundleData, this.bundleSchemas, (err, data) => {
                console.log(err);
            }); 
        });
    }

    renderSurat(data, surat): any {
        let fileName = remote.dialog.showSaveDialog({
            filters: [ {name: 'Word document', extensions: ['docx']}]
        });

        if(!fileName)
           return;
           
        if(!fileName.endsWith(".docx"))
            fileName = fileName+".docx";

        let angularParser= function(tag){
            var expr=expressions.compile(tag);
            return {get:expr};
        }

        let nullGetter = function(tag, props) {
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

        let content = fs.readFileSync('surat_templates/' + surat.code + '/' + surat.code + '.docx', "binary");
        let imageModule = new ImageModule(opts);   
        let zip = new JSZip(content);
       
        let doc = new Docxtemplater();
        doc.loadZip(zip);
        
        doc.setOptions({parser:angularParser, nullGetter: nullGetter});
        doc.attachModule(imageModule);
        doc.setData(data);
        doc.render();

        let buf = doc.getZip().generate({type:"nodebuffer"});
        fs.writeFileSync(fileName, buf);
        shell.openItem(fileName);
        let localPath = path.join(DATA_DIR, "surat_logs");

        if(!fs.existsSync(localPath))
            fs.mkdirSync(localPath);
        
        let fileId = base64.encode(uuid.v4()) + '.docx';
        let localFilename = path.join(localPath, fileId);

        this.copySurat(fileName, localFilename, (err) => {});
        APP.relaunch();

        return fileId;
    }

    convertDataURIToBinary(base64): any{
        if(!base64)
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

    copySurat(source, target, callback){
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
}
