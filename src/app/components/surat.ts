import { Component, ApplicationRef, ViewContainerRef, Input, Output, EventEmitter, OnInit, OnDestroy } from "@angular/core";
import { remote, shell } from "electron";
import { ToastsManager } from 'ng2-toastr';
import { Select2OptionData } from "ng2-select2";

import schemas from '../schemas';
import DataApiService from '../stores/dataApiService';
import SettingsService from '../stores/settingsService';
import SharedService from '../stores/sharedService';
import nomorSuratFormatter from '../helpers/nomorSuratFormatter';

import * as moment from 'moment';
import * as path from 'path';
import * as jetpack from 'fs-jetpack';
import * as expressions from 'angular-expressions';
import * as ImageModule from 'docxtemplater-image-module';
import * as JSZip from 'jszip';
import * as Docxtemplater from 'docxtemplater';
import * as uuid from 'uuid';
import * as uuidBase64 from 'uuid-base64';

@Component({
    selector: 'surat',
    templateUrl: '../templates/surat.html'
})
export default class SuratComponent implements OnInit, OnDestroy {
    private _penduduk;

    @Input()
    set penduduk(value) {
        this._penduduk = value;
    }
    get penduduk() {
        return this._penduduk;
    }

    @Output()
    onAddSuratLog: EventEmitter<any> = new EventEmitter<any>();
    
    surats: any[] = [];
    penduduks: any[] = [];
    filteredSurat: any[] = [];
   
    bundleData: any = null;
    bundleSchemas: any = null;
    selectedSurat: any = null;
    selectedPenduduk: any = null;
   
    isAutoNumber: boolean = false;
    isFormSuratShown: boolean = false;

    
    keyword: string = null;
    currentNomorSurat: string = null;

    constructor(private toastr: ToastsManager,
                private vcr: ViewContainerRef,
                private dataApiService: DataApiService,
                private sharedService: SharedService,
                private settingsService: SettingsService) {}

    ngOnInit(): void {
        this.bundleSchemas =  { 
            "penduduk": schemas.penduduk,
            "mutasi": schemas.mutasi,
            "log_surat": schemas.logSurat,
            "prodeskel": schemas.prodeskel,
            "nomor_surat": schemas.nomorSurat
        };

        this.bundleData = this.dataApiService.getLocalContent(this.bundleSchemas, 'penduduk');

        this.load();
    }

    load(): void {
        let dirFile = path.join(__dirname, 'surat_templates');
        let dirs = jetpack.list(dirFile);

        this.surats = [];

        dirs.forEach(dir => {
            let dirPath = path.join(dirFile, dir, dir + '.json');
            try {
                let jsonFile = JSON.parse(jetpack.read(dirPath));
                this.surats.push(jsonFile);
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

        this.filteredSurat = this.surats;

        let penduduks = this.bundleData['data']['penduduk'];

        penduduks.forEach(penduduk => {
            this.penduduks.push({id: penduduk[0], text: penduduk[1] + ' - ' + penduduk[2]});
        });
    }

    onPendudukSelected(data, type, selectorType): void {
        let penduduk = this.bundleData.data['penduduk'].filter(e => e[0] === data.id)[0];
        let form = this.selectedSurat.forms.filter(e => e.var === type)[0];

        if (!form)
            return;

        form.value = data.id;

        if (selectorType === 'penduduk') {
            form.value = schemas.arrayToObj(penduduk, schemas.penduduk);
            form.value['umur'] = moment().diff(new Date(form.value.tanggal_lahir), 'years');
        }
    }

    search(): void {
        this.filteredSurat = this.surats
            .filter(e => e.title.toLowerCase()
            .indexOf(this.keyword.toLowerCase()) > -1);
    }

    selectSurat(surat): boolean {
        this.selectedSurat = surat;
        this.isFormSuratShown = true;

        if (!this.bundleData['data']['nomor_surat'] || this.bundleData['data']['nomor_surat'].length === 0) {
            this.isAutoNumber = false;
            return false;
        }
        
        let number = this.createNumber();

        if (!number)
            return false;
        
        let nomorSuratForm = this.selectedSurat.forms.filter(e => e.var === 'nomor_surat')[0];
        let index = this.selectedSurat.forms.indexOf(nomorSuratForm);

        this.selectedSurat.forms[index]['value'] = number;
        this.isAutoNumber = true;

        return false;
    }

    createNumber(): string {
        this.currentNomorSurat = this.bundleData['data']['nomor_surat'].filter(e => e[0] === this.selectedSurat.code)[0];

        if (!this.currentNomorSurat) {
            this.isAutoNumber = false;
            return null;
        }

        let counter = parseInt(this.currentNomorSurat[2]);
        let segmentedFormats = this.currentNomorSurat[1].match(/\<.+?\>/g);
        let nomorSuratResult = this.currentNomorSurat[1]

        if (!segmentedFormats) {
            this.isAutoNumber = false;
            return null;
        }

        for (let i=0; i<segmentedFormats.length; i++) {
            if (nomorSuratFormatter[segmentedFormats[i]])
                nomorSuratResult = nomorSuratResult.replace(segmentedFormats[i], nomorSuratFormatter[segmentedFormats[i]](counter));
            else
                nomorSuratResult = nomorSuratResult.replace(segmentedFormats[i], '');
        }

        return nomorSuratResult;
    }

    print(): void {
        if (!this.penduduk)
            return;
        
        let objPenduduk = schemas.arrayToObj(this.penduduk, schemas.penduduk);
        let dataSettingsDir = this.sharedService.getSettingsFile();
        let dataSource = this.bundleData.data['penduduk'];
        let dataSettings = {};
        let dataForm = {};

        try {
            dataSettings = JSON.parse(jetpack.read(dataSettingsDir));
        }
        catch (e) {
            let dialog = remote.dialog;
            let dialogOptions = { 
                 type: 'question', 
                 buttons: ['Batal', 'Segera Cetak'], 
                 title: 'Konfigurasi Surat',
                 message: 'Konfigurasi anda belum diisi (nama dan jabatan penyurat serta logo desa), apakah anda mau melanjutkan?'
            };

            let choice = dialog.showMessageBox(remote.getCurrentWindow(), dialogOptions);

            if (choice == 0)
                return;
        }

        this.selectedSurat.forms.forEach(form => {
            dataForm[form.var] = form.value;

            if (form.selector_type === 'kk') {
                let keluarga = this.bundleData.data['penduduk'].filter(e => e[10] === form.value);
                dataForm[form.var] = [];

                keluarga.forEach(k => {
                    let objK = schemas.arrayToObj(k, schemas.penduduk);
                    objK['umur'] = moment().diff(new Date(objK.tanggal_lahir), 'years')
                    dataForm[form.var].push(objK);
                });
            }
        });

        objPenduduk['umur'] = moment().diff(new Date(objPenduduk.tanggal_lahir), 'years');

        let data = {
            vars: null,
            penduduk: objPenduduk,
            form: dataForm,
            logo: this.convertDataURIToBinary(dataSettings['logo'])
        };

        let desa = this.dataApiService.getDesa();

        data.vars = this.getVars(desa);

        let fileId = this.render(data, this.selectedSurat);

        if (!fileId) 
            return;

        let form = this.selectedSurat.data;
        let nomorSuratData = this.bundleData.data['nomor_surat'];

        let now = new Date();
        let log = [
            uuidBase64.encode(uuid.v4()),
            objPenduduk.nik,
            objPenduduk.nama_penduduk,
            this.selectedSurat.title,
            now.toString(),
            fileId
        ];

        this.onAddSuratLog.emit({log: log, nomorSurat: this.currentNomorSurat});
        
        let nomorSurat = this.createNumber();

        if (nomorSurat) {
            let nomorSuratForm = this.selectedSurat.forms.filter(e => e.var === 'nomor_surat')[0];
            let index = this.selectedSurat.forms.indexOf(nomorSuratForm);
            this.selectedSurat.forms[index]['value'] = nomorSurat;
        }
    }

    render(data, surat): any {
        let fileName = remote.dialog.showSaveDialog({
            filters: [{ name: 'Word document', extensions: ['docx'] }]
        });

        if (!fileName)
            return null;

        if (!fileName.endsWith(".docx"))
            fileName = fileName + ".docx";

        let params = {
            parser: (tag) => {
                return { get: expressions.compile(tag) }
            },
            nullGetter: (tag, options) => {
                return '';
            },
            options: {
                centered: false,
                getImage: (tagValue) => {
                    return tagValue;
                },
                getSize: (image, tagValue, tagName) => {
                    return [100, 100];
                }
            }
        }

        let dirPath = path.join(__dirname, 'surat_templates', surat.code, surat.file);
        let content = jetpack.read(dirPath, 'buffer');
        let imageModule = new ImageModule(params.options);
        let zip = new JSZip(content);
        let doc = new Docxtemplater();

        doc.loadZip(zip);
        doc.setOptions(params);
        doc.attachModule(imageModule);
        doc.setData(data);
        doc.render();

        let buf = doc.getZip().generate({ type: "nodebuffer" });

        jetpack.write(fileName, buf, { atomic: true });
        shell.openItem(fileName);

        let localPath = path.join(this.sharedService.getDesaDirectory(), "surat_logs");

        if (!jetpack.exists(localPath))
            jetpack.dir(localPath);

        let fileId = uuidBase64.encode(uuid.v4()) + '.docx';
        let localFilename = path.join(localPath, fileId);

        this.copySurat(fileName, localFilename, (err) => { });

        return fileId;
    }

    getVars(desa) {
        if (!desa)
            desa = {};
        
        if (this.settingsService.get('surat.alamat'))
            desa['alamat_desa'] = this.settingsService.get('surat.alamat');
        else
            desa['alamat_desa'] = '';
        
        return Object.assign({
            tahun: new Date().getFullYear(),
            tanggal: moment().format('LL'),
            jabatan: this.settingsService.get('surat.jabatan'),
            nama: this.settingsService.get('surat.penyurat')
        }, desa);
    }

    copySurat(source, target, callback) {
        let cbCalled = false;

        let done = (err) => {
            if (!cbCalled) {
                callback(err);
                cbCalled = true;
            }
        }

        let rd = jetpack.createReadStream(source);

        rd.on('error', (err) => {
            done(err);
        });

        let wr = jetpack.createWriteStream(target);

        wr.on('error', (err) => {
            done(err);
        });

        rd.pipe(wr);
    }

    convertDataURIToBinary(base64): any {
        if (!base64)
            return null;

        let string_base64 = base64.replace(/^data:image\/(png|jpg);base64,/, "");
        let binary_string = new Buffer(string_base64, 'base64').toString('binary');

        let len = binary_string.length;
        let bytes = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
            let ascii = binary_string.charCodeAt(i);
            bytes[i] = ascii;
        }

        return bytes.buffer;
    }

    openNomorSuratDialog(): void {
        $('#nomor-surat-modal')['modal']('show');
    }

    ngOnDestroy(): void {}
}