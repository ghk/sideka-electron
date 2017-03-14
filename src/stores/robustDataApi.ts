import * as os from 'os';
import * as fs from 'fs';
import env from '../env';
import * as request from 'request';
import { remote } from 'electron';
import schemas from "../schemas";
import * as adodb from "node-adodb";

var path = require('path');
var jetpack = require('fs-jetpack');
var app = remote.app;

const SERVER = 'https://api.sideka.id';
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");
jetpack.dir(CONTENT_DIR);

class Metadata{
    static getMetadatas(): any{
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        if(!jetpack.exists(fileName)){
            jetpack.write(fileName, JSON.stringify({}));
        }
        return JSON.parse(jetpack.read(fileName));
    }

    static setContentMetadata(key, value): void{
        let metas = Metadata.getMetadatas();
        metas[key] = value;
        let fileName = path.join(CONTENT_DIR, "metadata.json");
        jetpack.write(fileName, JSON.stringify(metas));
    }

    static getContentMetadata(key): any {
        let metas = this.getMetadatas();
        return metas[key];
    }
}

class RobustDataApi{
    constructor(){}
    
    saveChanges(data: any, type: string): void {

    }

    storeChanges(type: string): void {
        let offlines: any[] = Metadata.getContentMetadata('offlines');
        let offlineTypes: any[] = offlines.filter(e => e.indexOf(type));

        offlineTypes.forEach(offline => {
            let fileData = Metadata.get
        });
    }
}
