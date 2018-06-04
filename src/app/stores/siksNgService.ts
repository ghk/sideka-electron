import { Injectable } from '@angular/core';
import * as sqlite3 from 'sqlite3';

@Injectable()
export default class SiksNgService {
    private dbUrl;
    private db;
    private kdKec;
    private kdDesa;

    constructor(){
    }

    connect(dbUrl, kdKec, kdDesa){
        if(this.db){
            console.log("already connected");
            return;
        }
        this.dbUrl = dbUrl;
        this.kdKec = kdKec;
        this.kdDesa = kdDesa;
        this.db = new sqlite3.Database(dbUrl);
    }

    getAll(callback){
        this.db.all("SELECT * FROM udrt where KDKEC='"+this.kdKec+"' and KDDESA='"+this.kdDesa+"'", callback);
    }


}