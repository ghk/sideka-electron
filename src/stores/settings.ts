import { remote } from "electron";
import * as path from 'path';
import * as jetpack from 'fs-jetpack';
import * as fs from 'fs';

const APP = remote.app;
const DATA_DIR = APP.getPath("userData");

class Settings{
    dataFile: string;
    data : any = {} ;

    constructor(){
        this.dataFile = path.join(DATA_DIR, "settings.json");
        
        if(!jetpack.exists(this.dataFile))
            return;

        this.data = JSON.parse(jetpack.read(this.dataFile));
    }

    set(key, value) {
        this.data[key] = value;
        jetpack.write(this.dataFile, JSON.stringify(this.data));
    }
    
    setMany(dict, callback) {
        for (var key in dict){
            this.data[key] = dict[key];
        }
        fs.writeFile(this.dataFile, JSON.stringify(this.data), callback);
    }
}

export default new Settings();
