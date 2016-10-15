import request from 'request';
import path from 'path';
import { remote } from 'electron'; 
import jetpack from 'fs-jetpack'; // module loaded from npm
import $ from 'jquery';

var app = remote.app;
var DATA_DIR = app.getPath("userData");
var CONTENT_DIR = path.join(DATA_DIR, "contents");
jetpack.dir(CONTENT_DIR);

var dataapi = {
    getDir: function(type){
        var fileName = path.join(CONTENT_DIR, type+".xml");   
        return fileName;
    },
    
    getImage(div, url, callback){
        $.get(url, function(html){
            $(div).html("").append($(html));
            var ogImage = $("meta[property='og:image']", div).attr("content");
            if(ogImage){
                callback(ogImage);
            }
        });
    },

    getContent: function(type){
        var fileName = path.join(CONTENT_DIR, type+".xml");
        var content = jetpack.read(fileName,"xml");
        return content;
    },
    
    saveContent: function(type, content){
        
        var fileName = path.join(CONTENT_DIR, type+".xml");
        jetpack.write(fileName, content);
    }
}
export default dataapi;