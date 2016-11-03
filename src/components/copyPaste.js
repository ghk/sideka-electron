import { Component } from '@angular/core';
import { remote, app, shell, clipboard } from 'electron'; 

var CopyPasteComponent = Component({
    selector: 'copy-paste',
    inputs : ['hot'], 
    templateUrl: 'templates/copyPaste.html',
})
.Class({
    constructor: function() {
    },
    cut: function(){
        this.hot.copyPaste.setCopyableText();
        var value = this.hot.copyPaste.copyPasteInstance.elTextarea.value;
        this.hot.copyPaste.triggerCut();
        clipboard.writeText(value);
    },
    copy: function(){
        this.hot.copyPaste.setCopyableText();
        var value = this.hot.copyPaste.copyPasteInstance.elTextarea.value;
        clipboard.writeText(value);
    },
    paste: function(){
        this.hot.copyPaste.onPaste(clipboard.readText());
    }
});

export default CopyPasteComponent;