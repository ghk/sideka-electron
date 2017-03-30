import { remote } from "electron";
import DiffTracker from "../helpers/diffTracker";
import { Diff } from "../helpers/diffTracker";
import * as path from "path";
import * as $ from "jquery";

const app = remote.app;
const jetpack = require("fs-jetpack");
const DATA_DIR = app.getPath("userData");
const CONTENT_DIR = path.join(DATA_DIR, "contents");

const DATA_TYPE_DIRS = {
    "penduduk": path.join(CONTENT_DIR,  "penduduk.json")
}


export default class BasePage extends DiffTracker {
    isForceQuit: boolean;
    type: string;
    afterSaveAction: string;
    initialData: any[];
    page: number;
    limit: number;
    diff: Diff;
    hot: any;
    rowBegin: number;
    
    constructor(type: string){
        super();
        this.type = type;
        this.isForceQuit = false;
        this.afterSaveAction = null;
        this.initialData = [];
        this.rowBegin = 0;
    }

    openSaveDialog(): void {
        let data = this.initialData;

        if(this.type)
            data = JSON.parse(jetpack.read(DATA_TYPE_DIRS[this.type]))["data"][this.type];
        
        this.updateData();
        this.diff = this.trackDiff(data, this.initialData);

        if(this.diff.total > 0){
            this.afterSaveAction = null;
            $("#modal-save-diff")['modal']("show");
            setTimeout(() => {
                this.hot.unlisten();
                $("button[type='submit']").focus();
            }, 500);
        }
    }

    pageData(data: any[]): any[]{    
        let row  = (this.page - 1) * this.limit;
        let count = this.page * this.limit;
        let part  = [];
        

        for (;row < count;row++){
            if(!data[row])
                continue;

            part.push(data[row]);
        }

        return part;
    }

    updateData(): void {
        let currentData: any[] = this.hot.getSourceData();
        
        for(let i=0; i<this.initialData.length; i++){
            let data = currentData.filter(e => e[0] === this.initialData[i][0])[0];
            
            if(!data)
              continue;
            
            this.initialData[i] = data;
        }
    }

    next(): boolean {
        this.page += 1;
        this.updateData();
        this.hot.loadData(this.pageData(this.initialData));
        return false;
    }

    prev(): boolean {
        if(this.page == 1)
           return false;

        this.page -= 1;
        this.updateData();
        this.hot.loadData(this.pageData(this.initialData));
        return false;
    }

    forceQuit(){
        this.isForceQuit = true;
        this.afterSave();
    }

    afterSave(){
        if(this.afterSaveAction == "home")
            document.location.href="app.html";
        else if(this.afterSaveAction == "quit")
            app.quit();
    } 
}
