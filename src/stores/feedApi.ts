import { remote } from 'electron';
import * as request from 'request';
import * as crypto from 'crypto';
import * as fs from 'fs';

var $ = require('jquery');
var path = require('path');
var jetpack = require('fs-jetpack');

const APP = remote.app;
const DATA_DIR = APP.getPath("userData");
const FEEDS_DIR = path.join(DATA_DIR, "feeds");
jetpack.dir(FEEDS_DIR);

class FeedApi{
    constructor(){}

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

    getFeed(callback): void{
        var that = this;
        $.get({
            url: "http://kabar.sideka.id/feed",
            dataType: "xml",
            success: function(data) {
                var fileName = path.join(FEEDS_DIR, "feeds.xml");
                jetpack.write(fileName, (new XMLSerializer()).serializeToString(data));
                callback(data);          
            }
        })
        .fail(function(){
            that.getOfflineFeed(callback);
        });
        
    }

    getImage(div, url, callback): void{
        let hash = crypto.createHash('sha512').update(url).digest('hex');
        let imageFile = path.join(FEEDS_DIR, hash);
        let imageUrl = this.fileUrl(imageFile);
        if(jetpack.exists(imageFile)){
            callback(imageUrl);
            return;
        }
        
         $.get(url, function(html){
            $(div).html("").append($(html));
            let ogImage = $("meta[property='og:image']", div).attr("content");

            if(ogImage){
                request(ogImage).on("response", function(response){
                    var stream = fs.createWriteStream(imageFile);
                    response.pipe(stream).on('finish', function () {
                        callback(imageUrl);
                    });
                });
            }
        });
    }
}

export default new FeedApi();
