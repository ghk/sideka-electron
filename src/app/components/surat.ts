import { Component, ApplicationRef, ViewContainerRef, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy } from "@angular/core";
import { remote, shell } from "electron";
import { ToastsManager } from 'ng2-toastr';

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
import { DiffItem } from "../stores/bundle";
import { debug } from 'util';
import { Subscription } from 'rxjs';

@Component({
    selector: 'surat',
    changeDetection:ChangeDetectionStrategy.OnPush,
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

    pendudukArr: any[] = [];
    penduduks: any[] = [];

    filteredSurat: any[] = [];
   
    bundleSchemas: any = null;
    selectedSurat: any = null;
    selectedPenduduk: any = null;
    selectedNomorSurat: any = {};
    getDesaSubscription: Subscription = null;
    backupNomorSuratConfig = null;
   
    nextAutoNumberCounter: number;
    nomorSuratPreview: string;

    isFormSuratShown: boolean = false;

    keyword: string = null;

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
        
        this.load();
       (<any> $("#modal-nomor-surat")).on("hidden.bs.modal", () => {
            if(this.backupNomorSuratConfig == null)
                return;

            this.selectedNomorSurat = this.backupNomorSuratConfig;
       });
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

        let localBundle = this.dataApiService.getLocalContent(this.bundleSchemas, 'penduduk');
        let penduduks = localBundle['data']['penduduk'];
        this.pendudukArr = penduduks;

        penduduks.forEach(penduduk => {
            this.penduduks.push({id: penduduk[0], text: penduduk[1] + ' - ' + penduduk[2]});
        });
    }

    onPendudukSelected(data, type, selectorType): void {
        let penduduk = this.penduduks.filter(e => e[0] === data.id)[0];
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
        this.filteredSurat = this.keyword 
            ? this.surats
                .filter(e => e.title.toLowerCase()
                .indexOf(this.keyword.toLowerCase()) > -1) 
            : this.surats;
    }

    selectSurat(surat): boolean {
        this.selectedSurat = surat;
        this.isFormSuratShown = true;

        let localBundle = this.dataApiService.getLocalContent(this.bundleSchemas, 'penduduk');
        let selectedNomorSuratArr = localBundle['data']['nomor_surat'].filter(e => e[0] === this.selectedSurat.code)[0];
        this.selectedNomorSurat = selectedNomorSuratArr ? schemas.arrayToObj(selectedNomorSuratArr, schemas.nomorSurat) : {};
        this.setAutoNumber();
        
        return false;
    }

    setAutoNumber() {
        this.nextAutoNumberCounter = 0;

        if (this.selectedNomorSurat.is_auto_number) {
            let num = this.createNumber();
            let autoNomorSurat = num[0];
            this.nextAutoNumberCounter = num[1];
            let nomorSuratForm = this.selectedSurat.forms.filter(e => e.var === 'nomor_surat')[0];
            let index = this.selectedSurat.forms.indexOf(nomorSuratForm);
            this.selectedSurat.forms[index]['value'] = autoNomorSurat;
        }
    }

    createNumber(): any[] {
        if(!this.selectedNomorSurat.is_auto_number)
            return [null, 0];

        let today = moment(new Date());

        let lastCounter = null;

        if (this.selectedNomorSurat.last_counter)
            lastCounter = moment(new Date(this.selectedNomorSurat.last_counter));

        let counter = this.selectedNomorSurat.counter;
        let lastCounterYear = lastCounter ? lastCounter.year() : 0;
        let nowYear = today.year();

        let lastCounterMonth = lastCounter ? lastCounter.month() : 0;
        let nowMonth = today.month();

        if(isNaN(counter)){
            counter = 0;
        } else {
            counter += 1;
        }

        if ((nowYear - lastCounterYear) !== 0 && this.selectedNomorSurat.counter_type === 'yearly')
            counter = 0;

        if ((nowYear - lastCounterYear) !== 0 && (nowMonth - lastCounterMonth) !== 0 
            && this.selectedNomorSurat.counter_type === 'monthly')
            counter = 0;

        let result = "";

        if (this.selectedNomorSurat.format) {
            let segmentedFormats = this.selectedNomorSurat.format.match(/\<.+?\>/g);
            result = this.selectedNomorSurat.format;

            if (segmentedFormats) {
                for (let i=0; i<segmentedFormats.length; i++) {
                    if (nomorSuratFormatter[segmentedFormats[i]])
                        result = result.replace(segmentedFormats[i], nomorSuratFormatter[segmentedFormats[i]](counter));
                    else
                        result = result.replace(segmentedFormats[i], '');
                }
            }
        }

        return [result, counter];
    }

    print(): void {
        if (!this.penduduk)
            return;
        
        let objPenduduk = schemas.arrayToObj(this.penduduk, schemas.penduduk);
        let dataSettingsDir = this.sharedService.getSettingsFile();
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
                let keluarga = this.pendudukArr.filter(e => e[10] === form.value);
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

        let self = this;

        this.getDesaSubscription = this.dataApiService.getDesa(false).subscribe(result => {
            setTimeout(()=> {
                if(self.getDesaSubscription != null){
                    self.getDesaSubscription.unsubscribe();
                    self.getDesaSubscription = null;
                }
            }, 0);

            data.vars = self.getVars(result);
            let fileId = self.render(data, self.selectedSurat);

            if (!fileId) 
                return;

            let now = new Date();
            let log = [
                uuidBase64.encode(uuid.v4()),
                objPenduduk.nik,
                objPenduduk.nama_penduduk,
                self.selectedSurat.title,
                now.toISOString(),
                fileId
            ];

            self.selectedNomorSurat.counter = self.nextAutoNumberCounter;
            self.selectedNomorSurat.last_counter = new Date().toISOString();
            self.onAddSuratLog.emit({log: log, nomorSurat: self.selectedNomorSurat});
            
            self.setAutoNumber();
        });
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
        
        var result = Object.assign({
            tahun: new Date().getFullYear(),
            tanggal: moment().format('LL'),
            jabatan: this.settingsService.get('surat.jabatan'),
            nama: this.settingsService.get('surat.penyurat')
        }, desa);
        
        result['alamat_desa'] = this.settingsService.get('surat.alamat_desa');
        if (!result['alamat_desa']) {
            result['alamat_desa'] = '';
        }
        return result;
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

    addFormat(format): void {
       if(!this.selectedNomorSurat.format)
            this.selectedNomorSurat.format = "";   
       this.selectedNomorSurat.format +=  '/' + format;
    }

    openNomorSuratConfigDialog(): void{
        this.backupNomorSuratConfig = Object.assign({}, this.selectedNomorSurat);
        this.updateNomorSuratPreview(null);
       (<any> $("#modal-nomor-surat")).modal("show");
    }

    saveNomorSuratConfig(): void {
        this.backupNomorSuratConfig = null;
        let bundleSchemas = { 
            "penduduk": schemas.penduduk,
            "mutasi": schemas.mutasi,
            "log_surat": schemas.logSurat,
            "prodeskel": schemas.prodeskel,
            "nomor_surat": schemas.nomorSurat
        };

        let localBundle = this.dataApiService.getLocalContent(bundleSchemas, 'penduduk', null);
        let diff: DiffItem = { "modified": [], "added": [], "deleted": [], "total": 0 };

        let nomorSuratData = localBundle['data']['nomor_surat'];
        let currentNomorSuratArr = localBundle['data']['nomor_surat'].filter(e => e[0] === this.selectedSurat.code)[0];

        let nomorSuratArr = schemas.objToArray(this.selectedNomorSurat, schemas.nomorSurat);
        
        if (!currentNomorSuratArr) {
            nomorSuratArr[0] = this.selectedSurat.code;
            nomorSuratArr[2] = 1;
            diff.added.push(nomorSuratArr);
        }
        else {
            if (currentNomorSuratArr[0] != this.selectedSurat.code)
                currentNomorSuratArr[0] = this.selectedSurat.code;

            nomorSuratArr[0] = currentNomorSuratArr[0];
            diff.modified.push(nomorSuratArr);
        }
            
        diff.total = diff.deleted.length + diff.added.length + diff.modified.length;

        localBundle['diffs']['nomor_surat'].push(diff);

        let jsonFile = this.sharedService.getContentFile('penduduk', null);

        console.log(this.selectedNomorSurat.is_auto_number);

        this.dataApiService.saveContent('penduduk', null, localBundle, this.bundleSchemas, null).finally(() => {
            this.dataApiService.writeFile(localBundle, jsonFile, null);
            this.setAutoNumber();
        }).subscribe(
            result => {
                localBundle.changeId = result.changeId;
                if(currentNomorSuratArr){
                    let index = localBundle['data']['nomor_surat'].findIndex(d => d[0] == this.selectedSurat.code);
                    localBundle['data']['nomor_surat'][index] = nomorSuratArr;
                } else {
                    localBundle['data']['nomor_surat'].push(nomorSuratArr);
                }
                localBundle['diffs']['nomor_surat'] = [];

                this.toastr.success('Nomor Surat Berhasil Disimpan');
            },
            error => {
                this.toastr.error('Terjadi kesalahan pada server ketika menyimpan');
            }
        );
    }

    updateNomorSuratPreview(event){
        if(event)
            this.selectedNomorSurat.format = event.target.value;
        let num = this.createNumber();
        this.nomorSuratPreview = num[0];
    }

    ngOnDestroy(): void {}
}