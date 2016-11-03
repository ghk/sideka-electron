import request from 'request';
import path from 'path';
import { remote } from 'electron'; 
import jetpack from 'fs-jetpack'; // module loaded from npm
import $ from 'jquery';
import crypto from 'crypto';
import fs from 'fs';
import http from 'http';

var app = remote.app;
var DATA_DIR = app.getPath("userData");
var FEEDS_DIR = path.join(DATA_DIR, "feeds");
jetpack.dir(FEEDS_DIR);

function fileUrl(str) {
    if (typeof str !== 'string') {
        throw new Error('Expected a string');
    }

    var pathName = path.resolve(str).replace(/\\/g, '/');

    // Windows drive letter must be prefixed with a slash
    if (pathName[0] !== '/') {
        pathName = '/' + pathName;
    }

    return encodeURI('file://' + pathName);
};

var feedapi = {
    getFeed: function(callback){
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
            $.get({
                url: fileUrl(path.join(FEEDS_DIR, "feeds.xml")),
                dataType: "xml",
                success: function(data) {
                    callback(data);              
                }
            })
        });
        
    },
    getImage: function(div, url, callback){
        var hash = crypto.createHash('sha512').update(url).digest('hex');
        var imageFile = path.join(FEEDS_DIR, hash);
        var imageUrl = fileUrl(imageFile);
        if(jetpack.exists(imageFile)){
            callback(imageUrl);
        } else {
            $.get(url, function(html){
                $(div).html("").append($(html));
                var ogImage = $("meta[property='og:image']", div).attr("content");
                if(ogImage){
                    request(ogImage)

                    .on("response", function(response){
                        var stream = fs.createWriteStream(imageFile);
                        response.pipe(stream).on('finish', function () {
                            callback(imageUrl);
                        });
                    });
                }
            });
        }
    },
}
export default feedapi;