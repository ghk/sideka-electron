import { Component, Input } from "@angular/core";
import dataapi from '../stores/dataapi';
import schemas from '../schemas';
import { remote, shell } from 'electron'; // native electron module
import * as fs from 'fs';
import createPrintVars from '../helpers/printvars';

var $ = require('jquery');
var jetpack = require('fs-jetpack'); 
var Docxtemplater = require('docxtemplater');
var path = require('path');
var expressions = require('angular-expressions');
var ImageModule = require('docxtemplater-image-module');
var app = remote.app;
var DATA_DIR = app.getPath("userData");

window['app'] = app;

@Component({
    selector: 'surat',
    inputs : ['hot'], 
    templateUrl: 'templates/surat.html'
})
export default class SuratComponent{
    letters: any[];
    result: any[];
    keyword: string;
    hot: any;
    selectedLetter: any;
    logo: string;

    constructor(){   
        this.loadLetters();  
        this.selectedLetter = {};
        let dataFile = path.join(DATA_DIR, "setting.json");
        let data = jetpack.exists(dataFile) ? JSON.parse(jetpack.read(dataFile)) : {};
        this.logo = data.logo;
        this.selectedLetter = {
            "name": null,
            "thumbnail": null,
            "path": null,
            "code": null,
            "data": {}
        }
    }
    
    loadLetters(): void {
        this.letters = [{
            "name": 'Surat Keterangan Umum',
            "thumbnail": 'surat_keterangan_umum.png',
            "path":'surat_templates/surat_keterangan_umum.docx',
            "code": 'sku',
            "data": {}
        },{
            "name": 'Surat Keterangan Domisili',
            "thumbnail": 'surat_pengantar_domisili.png',
            "path": 'surat_templates/surat_pengantar_domisili.docx',
            "code": 'spd',
            "data": {}
        },{
            "name": 'Surat Keterangan Kelahiran',
            "thumbnail": 'surat_keterangan_kelahiran.png',
            "path": 'surat_templates/surat_keterangan_kelahiran.docx',
            "code": 'skk',
            "data": {}
        },{
            "name": 'Formulir Pindah Datang WNI',
            "thumbnail": 'formulir_pindah_datang_wni.png',
            "path": 'surat_templates/formulir_pindah_datang_wni.docx',
            "code": 'fpdwni',
            "data": {}
        },{
            "name": 'Formulir Pelaporan Kematian',
            "thumbnail": 'formulir_pelaporan_kematian.png',
            "path": 'surat_templates/formulir_pelaporan_kematian.docx',
            "code": 'fpk',
            "data": {}
        }];
       
        this.result = this.letters;
    }

    search(): void {
        if(!this.keyword || this.keyword === '')
            this.result = this.letters;

        this.result = this.letters.filter(e => e.name.indexOf(this.keyword) > -1);
    }

    selectLetter(letter: any): boolean {
        this.selectedLetter = letter;
        $('#' + letter.code).modal('show');
        return false;
    }

    printSKU(): void {
        var selected = this.hot.getSelected();
        var penduduk = schemas.arrayToObj(this.hot.getDataAtRow(selected[0]), schemas.penduduk);

        let dataFile = path.join(app.getPath("userData"), "setting.json");

        if(!jetpack.exists(dataFile))
            return null;

        let data = JSON.parse(jetpack.read(dataFile));
        let renderDocument = this.renderDocument;
        let selectedLetter = this.selectedLetter;

        dataapi.getDesa(desas => {
            let auth = dataapi.getActiveAuth();
            let desa = desas.filter(d => d.blog_id == auth['desa_id'])[0];
            let printvars = createPrintVars(desa);
            let form = selectedLetter.data;
            let docxData = { "vars": printvars, "penduduk": penduduk, "form": form, "logo": this.convertDataURIToBinary(data.logo)};     
            renderDocument(docxData, this.selectedLetter);
        });
    }

    printSPD(): void {
        var selected = this.hot.getSelected();
        var penduduk = schemas.arrayToObj(this.hot.getDataAtRow(selected[0]), schemas.penduduk);

        let dataFile = path.join(app.getPath("userData"), "setting.json");

        if(!jetpack.exists(dataFile))
            return null;

        let data = JSON.parse(jetpack.read(dataFile));
        let renderDocument = this.renderDocument;
        let selectedLetter = this.selectedLetter;
        let dataSource = this.hot.getSourceData();
        let keluargaRaw: any[] = dataSource.filter(e => e['21'] === penduduk.no_kk);
        let keluargaResult: any[] = [];

        let counter = 1;

        keluargaRaw.forEach((keluarga) => {
            var objRes = schemas.arrayToObj(keluarga, schemas.penduduk);
            objRes['no'] = counter;
            keluargaResult.push(objRes);
            counter++;
        })

        dataapi.getDesa(desas => {
            let auth = dataapi.getActiveAuth();
            let desa = desas.filter(d => d.blog_id == auth['desa_id'])[0];
            let printvars = createPrintVars(desa);
            let form = selectedLetter.data;
            let docxData = { "vars": printvars, "penduduk": penduduk, "keluarga": keluargaResult, 
            "form": form, "logo": this.convertDataURIToBinary(data.logo)}; 
            renderDocument(docxData, this.selectedLetter);
        });
    }

    printSKK(): void {
        var selected = this.hot.getSelected();
        var penduduk = schemas.arrayToObj(this.hot.getDataAtRow(selected[0]), schemas.penduduk);

        let dataFile = path.join(app.getPath("userData"), "setting.json");

        if(!jetpack.exists(dataFile))
            return null;

        let data = JSON.parse(jetpack.read(dataFile));
        let renderDocument = this.renderDocument;
        let selectedLetter = this.selectedLetter;
        
        dataapi.getDesa(desas => {
            let auth = dataapi.getActiveAuth();
            let desa = desas.filter(d => d.blog_id == auth['desa_id'])[0];
            let printvars = createPrintVars(desa);
            let form = selectedLetter.data;
            let docxData = { "vars": printvars, "penduduk": penduduk, "form": form, "logo": this.convertDataURIToBinary(data.logo)}; 
            renderDocument(docxData, this.selectedLetter);
        });
    }

    printFPK(): void {
        var selected = this.hot.getSelected();
        var penduduk = schemas.arrayToObj(this.hot.getDataAtRow(selected[0]), schemas.penduduk);

        let dataFile = path.join(app.getPath("userData"), "setting.json");

        if(!jetpack.exists(dataFile))
            return null;

        let data = JSON.parse(jetpack.read(dataFile));
        let renderDocument = this.renderDocument;
        let selectedLetter = this.selectedLetter;
        
        dataapi.getDesa(desas => {
            let auth = dataapi.getActiveAuth();
            let desa = desas.filter(d => d.blog_id == auth['desa_id'])[0];
            let printvars = createPrintVars(desa);
            let form = selectedLetter.data;
            let docxData = { "vars": printvars, "penduduk": penduduk, "form": form, "logo": this.convertDataURIToBinary(data.logo)}; 
            renderDocument(docxData, this.selectedLetter);
        });
    }

    printFPDWNI(): void{
        var selected = this.hot.getSelected();
        var penduduk = schemas.arrayToObj(this.hot.getDataAtRow(selected[0]), schemas.penduduk);
        var keluarga = schemas.arrayToObj(this.hot.getDataAtRow(selected[0]), schemas.keluarga);

        let dataFile = path.join(app.getPath("userData"), "setting.json");

        if(!jetpack.exists(dataFile))
            return null;

        let data = JSON.parse(jetpack.read(dataFile));
        let renderDocument = this.renderDocument;
        let selectedLetter = this.selectedLetter;
        let dataSource = this.hot.getSourceData();
        let penduduksRaw: any[] = dataSource.filter(e => e['21'] === penduduk.no_kk);
        let penduduks: any[] = [];

        let counter = 1;

        penduduksRaw.forEach((keluarga) => {
            var objRes = schemas.arrayToObj(keluarga, schemas.penduduk);
            objRes['no'] = counter;
            penduduks.push(objRes);
            counter++;
        })

        dataapi.getDesa(desas => {
            let auth = dataapi.getActiveAuth();
            let desa = desas.filter(d => d.blog_id == auth['desa_id'])[0];
            let printvars = createPrintVars(desa);
            let form = selectedLetter.data;
            let docxData = { "vars": printvars, "penduduk": penduduk, "form": form, "keluarga": null,
                            "penduduks": penduduks, "logo": this.convertDataURIToBinary(data.logo)}; 

            renderDocument(docxData, this.selectedLetter);
        });
    }

    renderDocument(docxData: any, letter: any): void{
        var fileName = remote.dialog.showSaveDialog({
            filters: [
                {name: 'Word document', extensions: ['docx']},
            ]
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

        let content = fs.readFileSync(letter.path, "binary");
        let imageModule = new ImageModule(opts);   
        let doc = new Docxtemplater(content);
        
        doc.setOptions({parser:angularParser, nullGetter: nullGetter});
        doc.attachModule(imageModule);
        doc.setData(docxData);
        doc.render();

        let buf = doc.getZip().generate({type:"nodebuffer"});
        fs.writeFileSync(fileName, buf);
        shell.openItem(fileName);
        app.relaunch();
    }

    convertDataURIToBinary(base64): any{
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
}
