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
        this.db.all("SELECT * FROM udrt where KDKEC= ? and KDDESA = ?", this.kdKec, this.kdDesa, callback);
    }

    getRegions(dbUrl, callback){
        let result = {};
        let db = new sqlite3.Database(dbUrl)
        db.serialize(() => {
            db.all("SELECT * FROM m_desa", (err, rows) => {
                if(err){
                    callback(err, null);
                    db.close();
                    return;
                }
                result["desa"] = rows;
                db.all("select * from m_kecamatan where kode_kecamatan in (select kode_kecamatan from m_desa);", (err, rows) => {
                    if(err){
                        callback(err, null);
                        db.close();
                        return;
                    }
                    result["kecamatan"] = rows;
                    db.all("select * from m_kabupaten_kota where substr(kode_kab, length(kode_provinsi)+1) in (select kode_kab from m_kecamatan);", (err, rows) => {
                        if(err){
                            callback(err, null);
                            db.close();
                            return;
                        }
                        result["kabupaten"] = rows;
                        db.all("select * from m_provinsi where kode_provinsi in (select kode_provinsi from m_kabupaten_kota);", (err, rows) => {
                            if(err){
                                callback(err, null);
                                db.close();
                                return;
                            }
                            result["provinsi"] = rows;
                            db.close();
                            callback(null, result);
                        });;
                    });;
                });;
            });;
        })
    }


}