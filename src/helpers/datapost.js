import request from 'request';
import path from 'path';
import { remote } from 'electron'; 
import jetpack from 'fs-jetpack'; // module loaded from npm

var app = remote.app;
var DATA_DIR = app.getPath("userData");
var CONTENT_DIR = path.join(DATA_DIR, "contents");
jetpack.dir(CONTENT_DIR);

var dataapi = {
    getDir: function(type){
        var fileName = path.join(CONTENT_DIR, type+".xml");   
        return fileName;
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