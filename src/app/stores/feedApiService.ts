import { remote } from 'electron';
import { Injectable } from '@angular/core';
import { Response, Headers, RequestOptions } from '@angular/http';
import { ProgressHttp } from 'angular-progress-http';
import { Observable } from 'rxjs';

import * as crypto from 'crypto';
import * as path from "path";

import 'rxjs/add/observable/throw';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/share';
import 'rxjs/add/operator/map';

var jetpack = require('fs-jetpack');

const APP = remote.app;
const DATA_DIR = APP.getPath("userData");
const FEEDS_DIR = path.join(DATA_DIR, "feeds");

@Injectable()
export class FeedApiService {

    constructor(private http: ProgressHttp) {
        jetpack.dir(FEEDS_DIR);
    }

    fileUrl(str): any {
        if (typeof str !== 'string') 
            throw new Error('Expected a string'); 

        let pathName = path.resolve(str).replace(/\\/g, '/');

        if (pathName[0] !== '/') 
            pathName = '/' + pathName;
        
        return encodeURI('file://' + pathName);
    }

    getOfflineFeed(callback): void{
        $.get({
            url: this.fileUrl(path.join(FEEDS_DIR, "feeds.xml")),
            dataType: "xml",
            success: function(data) {
                callback(data);              
            }
        });
    }

    getFeed(): Observable<any> {
        var that = this;
        let feedUrl = "http://kabar.sideka.id/feed";
        let headers = new Headers({'Accept': 'application/xml'});
        let options = new RequestOptions({ headers: headers });
        return this.http
            .get(feedUrl, options)
            .map(res => res.text())
            .catch(this.handleError);
    }

    getLocalImageUrl(url) {
        let hash = crypto.createHash('sha512').update(url).digest('hex');
        let imageFile = path.join(FEEDS_DIR, hash);
        let fileUrl = this.fileUrl(imageFile);
        return fileUrl;
    }

    getImagePage(pageUrl): Observable<any> {
        return this.http
            .get(pageUrl)
            .map(res => res.text())
            .catch(this.handleError);
    }

    getImage(imageUrl): Observable<any> {                
        return this.http
            .get(imageUrl)
            .map(res => res.arrayBuffer())
            .catch(this.handleError)           
    }

    private handleError(error: Response | any) {
        let errMsg: string;
        if (error instanceof Response) {
            const body = error.json() || '';
            const err = body.error || JSON.stringify(body);
            errMsg = `${error.status} - ${error.statusText || ''} ${err}`;
        } else {
            errMsg = error.message ? error.message : error.toString();
        }
        return Observable.throw(errMsg);
    }
}