var Handsontable = {renderers: null};
var $ = require('jquery');

try {
    Handsontable = require('./handsontablep/dist/handsontable.full.js');
} catch(e){
    console.log("no window", e);
}

export function monospaceRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    $(td).addClass('monospace');
    return td;
}

export function kodeRekeningValidator(value, callback){
    var data = this.instance.getDataAtCol(this.col);
    var index = data.indexOf(value);
    var valid = true;
    if (value && index > -1 && this.row !== index) {
        valid = false;
    }
    callback(valid);
}

export function anggaranRenderer(instance, td, row, col, prop, value, cellProperties) {
    var isSum = false;
    if(instance.sumCounter && !Number.isFinite(value) && !value){
        var code = instance.getDataAtCell(row, 0);
        if(code){
            isSum = true;
            value = instance.sumCounter.sums[code];
        }
    }
    var args = [instance, td, row, col, prop, value, cellProperties];
    Handsontable.renderers.NumericRenderer.apply(this, args);
    $(td).addClass('anggaran');
    $(td).removeClass('sum');
    if(isSum)
        $(td).addClass('sum');
    if(td.innerHTML && td.innerHTML.length > 0){
        var maxLength = 24;
        var length = td.innerHTML.length;
        td.innerHTML = "Rp. "+new Array(maxLength - length).join(" ")+td.innerHTML;
    }
    return td;
}

export function anggaranValidator(value, callback){
    var data = this.instance.getDataAtCol(this.col);
    var valid = true;
    if(this.instance.sumCounter && Number.isFinite(value) && value){
        var code = this.instance.getDataAtCell(this.row, 0);
        if(code){
            var sumValue = this.instance.sumCounter.sums[code];
            if(sumValue && value !== sumValue){
                valid = false;
            }
        }
    }
    callback(valid);
}

export function uraianRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    var level = 5;
    var code = instance.getDataAtCell(row, 0);    
    
    if(code && code.split){
        code = (code.slice(-1)=='.') ? code.slice(0,-1):code;
        level = code.split(".").length - 1;
    }
    td.style.paddingLeft = (3 + (level * 15))+"px";
    return td;
}

export function uraianRenstraRenderer(instance, td, row, col, prop, value, cellProperties){
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    var level = 5;
    var code = instance.getDataAtCell(row, 0);
    if(code && code.split){
        code = code.replace(/[.]/g,'').match(/.{1,2}/g).join('.')        
        level = code.split(".").length - 3;
    }
    td.style.paddingLeft = (4 + (level * 15))+"px";
    return td;
}