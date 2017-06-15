import { remote } from "electron";
import * as path from 'path';
import * as jetpack from 'fs-jetpack';

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
    
    setMany(dict) {
        for (var key in dict){
            this.data[key] = dict[key];
        }
        jetpack.write(this.dataFile, JSON.stringify(this.data));
    }

}

export default new Settings();
