var { Component } = require('@angular/core');
var { remote, app, shell, clipboard } = require('electron');

var hot: any;

@Component({
    selector: 'copy-paste',
    inputs : ['hot'], 
    templateUrl: 'templates/copyPaste.html',
}) 
export default class CopyPasteComponent{
    hot: any;
    
    constructor(){
        this.hot = hot;
    }

    cut(){
        this.hot.copyPaste.setCopyableText();
        var value = this.hot.copyPaste.copyPasteInstance.elTextarea.value;
        this.hot.copyPaste.triggerCut();
        clipboard.writeText(value);
    }

    copy(){
        this.hot.copyPaste.setCopyableText();
        var value = this.hot.copyPaste.copyPasteInstance.elTextarea.value;
        clipboard.writeText(value);
    }

    paste(){
        this.hot.copyPaste.onPaste(clipboard.readText());
    }
}
