import request from 'request';
import path from 'path';
import { remote } from 'electron'; 
import jetpack from 'fs-jetpack'; // module loaded from npm
import env from '../env';

var SERVER = "http://api.sideka.id";
if(env.name !== "production")
    SERVER = "http://10.10.10.107:5000";
var app = remote.app;
var DATA_DIR = app.getPath("userData");
var CONTENT_DIR = path.join(DATA_DIR, "contents");
jetpack.dir(CONTENT_DIR);

var dataapi = {
    
    auth: null,

    getActiveAuth: function () {
        var authFile = path.join(DATA_DIR, "auth.json");
        if(!jetpack.exists(authFile))
            return null;
        return JSON.parse(jetpack.read(authFile));
    },

    saveActiveAuth: function(auth) {
        var authFile = path.join(DATA_DIR, "auth.json");
        if(auth)
            jetpack.write(authFile, JSON.stringify(auth));
        else
            jetpack.remove(authFile);
    },

    login: function(user, password, callback){
        request({
            url: SERVER+"/login",
            method: "POST",
            json: {"user": user, "password": password},
        }, callback);
    },
    
    getContent: function(type, defaultValue, callback){
        var fileName = path.join(CONTENT_DIR, type+".json");
        var fileContent = defaultValue;
        var timestamp = 0;
        var auth = this.getActiveAuth();

        if(jetpack.exists(fileName)){
            fileContent =  JSON.parse(jetpack.read(fileName));
            timestamp = fileContent.timestamp;
        }
        request({
            url: SERVER+"/content/"+auth.desa_id+"/"+type,
            method: "GET",
            headers: {
                "X-Auth-Token": auth.token.trim()
            }
        }, function(err, response, body){
            if(!response || response.statusCode != 200) {
                callback(fileContent);
            } else {
                jetpack.write(fileName, body);
                callback(JSON.parse(body));
            }
        });
    },
    
    saveContent: function(type, content){
        var fileName = path.join(CONTENT_DIR, type+".json");
        jetpack.write(fileName, JSON.stringify(content));
        var auth = this.getActiveAuth();
        request({
            url: SERVER+"/content/"+auth.desa_id+"/"+type,
            method: "POST",
            headers: {
                "X-Auth-Token": auth.token.trim()
            },
            json: content
        }, function(err, response, body){
            if(!response || response.statusCode != 200) {
                //todo, save later
            } 
        });
    }
    
    
}
export default dataapi;