const $ = require('jquery');
import { remote } from "electron";

class TitleBar{
    constructor(){}

    initializeButtons(): any {
        $("#titlebar-close-button").click(function(){ 
            remote.getCurrentWindow().close(); 
            return false; 
        });
        $("#titlebar-maximize-button").click(function(){ 
            remote.getCurrentWindow().isMaximized() ? remote.getCurrentWindow().unmaximize() : remote.getCurrentWindow().maximize(); 
            return false;
        });
        $("#titlebar-minimize-button").click(function(){ 
            remote.getCurrentWindow().minimize(); 
            return false; 
        });
        $(".titlebar-buttons").show();
    }
    
    title(title){
        $("title").html(title);
        $(".titlebar-title").html(title);
    }
    
    normal(title = null) {
        if(title){
            this.title(title);
        }
        $(".titlebar").removeClass("blue");
    }

    blue(title = null) {
        if(title){
            this.title(title);
        }
        $(".titlebar").addClass("blue");
    }
}

export default new TitleBar();
