import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const jetpack = require('fs-jetpack');
const appPackage = require('../../../package.json');
import { SharedService } from '../stores/sharedService';
import  { Migration230 } from './migration230';

export interface IMigration {
    version: string;
    apply(migrator: Migrator);
}

export class Migrator {

    public dataPackage;
    public dataVersion;

    public appPackage;
    public appVersion;

    constructor(public sharedService: SharedService) {
    }

    isVersionGreaterThan (v1, v2){
        return this.versionToNumber(v1) > this.versionToNumber(v2);
    }

    versionToNumber(v1){
        if(!v1 || !v1.split)
            return 0;
        var splitted = v1.split(".");
        return parseInt(splitted[0]) * 1000000 + parseInt(splitted[1]) * 1000 + parseInt(splitted[2]);
    }

    run(): boolean {
        this.dataPackage = this.getDataPackage();
        this.dataVersion = this.dataPackage["version"];
        this.appPackage = appPackage;
        this.appVersion = this.appPackage.version;

        if(this.isVersionGreaterThan(this.appVersion, this.dataVersion)){
            var migrators : IMigration[] = [
                new Migration230()
            ];

            for(var migrator of migrators){
                if(this.isVersionGreaterThan(migrator.version, this.dataVersion)){
                    console.log(migrator.version);
                    try {
                        migrator.apply(this);
                    }
                    catch(exception) {
                        console.log(exception);
                    }
                }
            }
            this.writeDataPackage()
            return true;
        }
        return false;
    }

    getDataPackage(): any {
        let result = {};
        let fileName = path.join(this.sharedService.getDataDirectory(), "package.json");

        if (jetpack.exists(fileName))
            result = JSON.parse(jetpack.read(fileName));

        return result;
    }

    writeDataPackage() {
        let fileName = path.join(this.sharedService.getDataDirectory(), "package.json");
        jetpack.write(fileName, JSON.stringify(appPackage));
    }
}