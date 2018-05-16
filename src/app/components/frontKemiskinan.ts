import { remote, shell } from "electron";
import { Component, NgZone, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { Progress } from 'angular-progress-http';
import { ToastsManager } from 'ng2-toastr';
import { pbdtIdvImporterConfig, pbdtRtImporterConfig, Importer } from '../helpers/importer';
import { Router, ActivatedRoute } from "@angular/router";
import { DiffTracker, DiffMerger } from "../helpers/diffs";

import { DiffItem } from '../stores/bundle';
import DataApiService from '../stores/dataApiService';
import SharedService from '../stores/sharedService';

import * as uuid from 'uuid';
import schemas from '../schemas';

var base64 = require("uuid-base64");

@Component({
    selector: 'front-kemiskinan',
    templateUrl: '../templates/frontKemiskinan.html',
    styles: [`
        :host {
            display: flex;
        }
    `],
})
export default class FrontKemiskinanComponent {
    progress: Progress;
    subs: any[];
    importer: any;
    importedData: any;
    pbdtYear: string;

    constructor(private zone: NgZone, 
                private dataApiService: DataApiService,
                private sharedService: SharedService,
                private toastr: ToastsManager,
                private router: Router,
                private route: ActivatedRoute,
                private vcr: ViewContainerRef){
        
          this.toastr.setRootViewContainerRef(vcr);
    }

    ngOnInit(): void {
        this.progress = { event: null, lengthComputable: true, loaded: 0, percentage: 0, total: 0 };
        this.importer = { "pbdtIdv": new Importer(pbdtIdvImporterConfig), "pbdtRt": new Importer(pbdtRtImporterConfig) };
        this.importedData = { "pbdtIdv": [], "pbdtRt": [] };

        this.dataApiService.getContentSubType('kemiskinan', this.progressListener.bind(this)).subscribe(
            result => {
                this.subs = result;
            },
            error => {}
        );
    }

    initImportFile(type): void {
        let files = remote.dialog.showOpenDialog(null);

        if (files && files.length) {
            this.importer[type].init(files[0]);
            let objData = this.importer[type].getResults();
  
            for(let i=0; i<objData.length; i++)
                objData[i]['id'] = base64.encode(uuid.v4());
        
            this.importedData[type] = objData.map(o => schemas.objToArray(o, schemas[type]));
        }
    }

    doImport(): void {
        if (!this.pbdtYear) {
            this.toastr.error('Tahun harus diisi');
            return;
        }

        let existingYear = this.subs.filter(e => e == this.pbdtYear)[0];

        if (existingYear) {
            this.toastr.error('Tahun sudah ada');
            return;
        }

        let bundleData = { "pbdtIdv": this.importedData["pbdtIdv"],  "pbdtRt": this.importedData["pbdtRt"] };
        let bundleSchemas = { "pbdtRt": schemas.pbdtRt, "pbdtIdv": schemas.pbdtIdv };
        let localBundle = this.dataApiService.getLocalContent(bundleSchemas, "kemiskinan", this.pbdtYear);
        let diffs = this.trackDiffs(localBundle["data"], bundleData);

        if (diffs.pbdtIdv.total > 0)
            localBundle['diffs']['pbdtIdv'] = localBundle['diffs']['pbdtIdv'].concat(diffs.pbdtIdv);
        if (diffs.pbdtRt.total > 0)
            localBundle['diffs']['pbdtRt'] = localBundle['diffs']['pbdtRt'].concat(diffs.pbdtRt);

        this.dataApiService.saveContent('kemiskinan', this.pbdtYear, localBundle, bundleData, this.progressListener.bind(this))
            .finally(() => {
                this.dataApiService
                    .writeFile(localBundle, this.sharedService.getContentFile('kemiskinan', this.pbdtYear), this.toastr);
            })
            .subscribe(
                result => {
                    let mergedResult = this.mergeContent(result, localBundle);
                    mergedResult = this.mergeContent(localBundle, mergedResult);

                    localBundle.diffs['pbdtIdv'] = [];
                    localBundle.diffs['pbdtRt'] = [];

                    localBundle.data['pbdtIdv'] = mergedResult['data']['pbdtIdv'];
                    localBundle.data['pbdtRt'] = mergedResult['data']['pbdtRt'];

                    this.toastr.success('Data Kemiskinan Berhasil Disimpan');
                    this.ngOnInit();
                },
                error => {}
        );
    }

    mergeContent(newBundle, oldBundle): any {
        if (newBundle['diffs']) {
            let newPbdtIdvDiffs = newBundle["diffs"]["pbdtIdv"] ? newBundle["diffs"]["pbdtIdv"] : [];
            let newPbdtRtDiffs = newBundle["diffs"]["pbdtRt"] ? newBundle["diffs"]["pbdtRt"] : [];
          
            oldBundle["data"]["pbdtIdv"] = DiffMerger.mergeDiffs(newPbdtIdvDiffs, oldBundle["data"]["pbdtIdv"]);
            oldBundle["data"]["pbdtRt"] = DiffMerger.mergeDiffs(newPbdtRtDiffs, oldBundle["data"]["pbdtRt"]);
        }
        else {
            oldBundle["data"]["pbdtIdv"] = newBundle["data"]["pbdtIdv"] ? newBundle["data"]["pbdtIdv"] : [];
            oldBundle["data"]["pbdtRt"] = newBundle["data"]["pbdtRt"] ? newBundle["data"]["pbdtRt"] : [];
        }

        oldBundle.changeId = newBundle.change_id ? newBundle.change_id : newBundle.changeId;
        return oldBundle;
    }

    trackDiffs(localData, realTimeData): any {
        return {
            "pbdtIdv": DiffTracker.trackDiff(localData['pbdtIdv'], realTimeData['pbdtIdv']),
            "pbdtRt": DiffTracker.trackDiff(localData['pbdtRt'], realTimeData['pbdtRt'])
        };
    }

    progressListener(progress: Progress){
        this.progress = progress;
    }
}
