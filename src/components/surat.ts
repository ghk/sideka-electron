import { Component, Input } from "@angular/core";
import dataApi from '../stores/dataApi';
import schemas from '../schemas';
import { remote, shell } from 'electron'; // native electron module
import * as fs from 'fs';
import createPrintVars from '../helpers/printvars';

var JSZip = require('jszip');
var $ = require('jquery');
var jetpack = require('fs-jetpack'); 
var Docxtemplater = require('docxtemplater');
var path = require('path');
var expressions = require('angular-expressions');
var ImageModule = require('docxtemplater-image-module');
var app = remote.app;
var DATA_DIR = app.getPath("userData");

var hot;

window['app'] = app;

@Component({
    selector: 'surat',
    inputs : ['hot', 'penduduk'], 
    templateUrl: 'templates/surat.html'
})
export default class SuratComponent{
    letters: any[];
    result: any[];
    keyword: string;
    hot: any;
    selectedLetter: any;
    logo: string;
    showSuratList: boolean;
    @Input() penduduk;

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
        };
    }
    
    loadLetters(): void{
        let dirs = fs.readdirSync('surat_templates');

        this.letters = [];

        dirs.forEach(dir => {
            let jsonFile = JSON.parse(jetpack.read('surat_templates/' + dir + '/' + dir + '.json'));
            this.letters.push(jsonFile);
        })

        this.result = this.letters;
    }

    search(): void {
        if(!this.keyword || this.keyword === '')
            this.result = this.letters;

        this.result = this.letters.filter(e => e.title.indexOf(this.keyword) > -1);
    }

    selectLetter(letter: any): boolean {
        this.selectedLetter = letter;
        this.showSuratList = !this.showSuratList;
        return false;
    }

    print(): void {
        if(this.penduduk)
            return;

        let penduduk = schemas.arrayToObj(this.penduduk, schemas.penduduk);
        let dataSettingsDir = path.join(app.getPath("userData"), "settings.json");

        if(!jetpack.exists(dataSettingsDir))
            return;
        
        let dataSettings = JSON.parse(jetpack.read(dataSettingsDir));
        let renderDocument = this.renderDocument;
        let dataSource = this.hot.getSourceData();
        let keluargaRaw: any[] = dataSource.filter(e => e['22'] === this.penduduk.no_kk);
        let keluargaResult: any[] = [];
        
        let penduduksRaw: any[] = dataSource.filter(e => e['22'] === this.penduduk.no_kk);
        let penduduks: any[] = [];
   
        for(let i=0; i<keluargaRaw.length; i++){
            var objRes = schemas.arrayToObj(keluargaRaw[i], schemas.penduduk);
            objRes['no'] = (i + 1);
            keluargaResult.push(objRes);
        }

        for(let i=0; i<penduduksRaw.length; i++){
            var objRes = schemas.arrayToObj(penduduksRaw[i], schemas.penduduk);
            objRes['no'] = (i + 1);
            penduduks.push(objRes);
        }

        let formData = {};

        for(let i=0; i<this.selectedLetter.forms.length; i++)
            formData[this.selectedLetter.forms[i]["var"]] = this.selectedLetter.forms[i]["value"];
        
        let docxData = { "vars": null, 
             "penduduk": penduduk, 
             "form": formData,  
             "logo": this.convertDataURIToBinary(dataSettings.logo), 
             "keluarga": keluargaResult, 
             "penduduks": penduduks};    
        
        dataApi.getDesa(desas => {
            let auth = dataApi.getActiveAuth();
            let desa = desas.filter(d => d.blog_id == auth['desa_id'])[0];
            let printvars = createPrintVars(desa);
            let form = this.selectedLetter.data;
            docxData.vars = printvars;
            renderDocument(docxData, this.selectedLetter);
        })
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

        let content = fs.readFileSync('surat_templates/' + letter.code + '/' + letter.code + '.docx', "binary");
        let imageModule = new ImageModule(opts);   
        let zip = new JSZip(content);
       
        let doc = new Docxtemplater();
        doc.loadZip(zip);
        
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
}
