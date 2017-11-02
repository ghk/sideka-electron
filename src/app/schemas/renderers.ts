var Handsontable = { renderers: null };
var $ = require('jquery');

try {
    Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');
} catch (e) {
    console.log("no window", e);
}

function getValue(instance, td, row, col, prop, value, cellProperties, propertyName) {
    var isSum = false;

    if (instance.sumCounter && !Number.isFinite(value) && !value) {
        var id = instance.getDataAtCell(row, 0);
        var code = instance.getDataAtCell(row, 1);
        var codeBidOrKeg = instance.getDataAtCell(row, 2);

        if (id) {
            isSum = true;
            value = instance.sumCounter.sums[propertyName][id];
        }
    }

    var args = [instance, td, row, col, prop, value, cellProperties];
    Handsontable.renderers.NumericRenderer.apply(this, args);
    $(td).addClass('anggaran');
    $(td).removeClass('sum');
    if (isSum)
        $(td).addClass('sum');
    if (td.innerHTML && td.innerHTML.length > 0) {
        var maxLength = 15;
        var length = td.innerHTML.length;
        td.innerHTML = "Rp. " + new Array(maxLength - length).join(" ") + td.innerHTML;
    }
    return td;
}

export function centerRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.CheckboxRenderer.apply(this, arguments);
    td.style.textAlign = 'center';
    return td;
}

export function propertiesRenderer (instance, td, row, col, prop, value, cellProperties) {
    td.style.textAlign = 'center';
    let dataId = "val-" + row + "-" + col;
    let buttonId = "btn1-" + row + "-" + col;

    let buttonView = $('<button class="btn btn-xs" id=' + buttonId + '>Lihat</button>');
    let data = $('<span style="display: none;" id=' + dataId + '>' + value + '</span>');

    let childKeys = Object.keys(td.childNodes);
    
    if(childKeys.length === 0) {
        td.appendChild(buttonView[0]);
        td.appendChild(data[0]);
    }
    else {
        for(let i=0; i<childKeys.length; i++) {
            let key = childKeys[i];
            let element = td.childNodes[key];

            if(!element) {
                td.appendChild(buttonView[0]);
                td.appendChild(data[0]);
                break;
            }

            if(buttonId === element.id || dataId === element.id)
                continue;
        }
    }
    return td;
}

export function rabRenderer (instance, td, row, col, prop, value, cellProperties) {
    td.style.textAlign = 'center';

    let dataId = "val-" + row + "-" + col;
    let buttonId = "btn0-" + row + "-" + col;

    let buttonView = $('<button class="btn btn-xs" id=' + buttonId + '>Lihat</button>');
    let data = $('<span style="display: none;" id=' + dataId + '>' + value + '</span>');

    let childKeys = Object.keys(td.childNodes);
    
    if(childKeys.length === 0) {
        td.appendChild(buttonView[0]);
        td.appendChild(data[0]);
    }

    else {
        for(let i=0; i<childKeys.length; i++) {
            let key = childKeys[i];
            let element = td.childNodes[key];

            if(!element) {
                td.appendChild(buttonView[0]);
                td.appendChild(data[0]);
                break;
            }

            if(buttonId === element.id || dataId === element.id)
                continue;
        }
    }

    return td;  
}   

export function monospaceRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    $(td).addClass('monospace');
    return td;
}

export function chosenRenderer(instance, td, row, col, prop, value, cellProperties) {
    var selectedId;
    var optionsList = cellProperties.chosenOptions.data;

    if(typeof optionsList === "undefined" || typeof optionsList.length === "undefined" || !optionsList.length) {
        Handsontable['TextCell'].renderer(instance, td, row, col, prop, value, cellProperties);
        return td;
    }

    var values = (value + "").split(",");
    value = [];
    for (var index = 0; index < optionsList.length; index++) {

        if (values.indexOf(optionsList[index].id + "") > -1) {
            selectedId = optionsList[index].id;
            value.push(optionsList[index].label);
        }
    }
    value = value.join(", ");

    Handsontable['TextCell'].renderer(instance, td, row, col, prop, value, cellProperties);
    return td;
}

export function anggotaRenderer(instance, td, row, col, prop, value, cellProperties) {
   var args = [instance, td, row, col, prop, value.length, cellProperties];
   Handsontable.renderers.NumericRenderer.apply(this, args);
   return td;
}

export function kodeRekeningValidator(value, callback) {
    var data = this.instance.getDataAtCol(this.col);
    var index = data.indexOf(value);
    var valid = true;
    if (value && index > -1 && this.row !== index) {
        valid = false;
    }
    callback(valid);
}

export function makeRupiahRenderer(maxLength=24, sumPropertyName=null, idIndex=0, isRab=null){
    return function(instance, td, row, col, prop, value, cellProperties){
        var isSum = false;
        if(isRab){
            rabUnEditableRenderer(instance, td, row, col, prop, value, cellProperties);
        }
        if (sumPropertyName && instance.sumCounter && !Number.isFinite(value) && !value) {
            var id = instance.getDataAtCell(row, idIndex);
            if (id) {
                isSum = true;
                if(sumPropertyName === true){
                    value = instance.sumCounter.sums[id];
                } else {
                    value = instance.sumCounter.sums[sumPropertyName][id];
                }
            }
        }

        var args = [instance, td, row, col, prop, value, cellProperties];
        Handsontable.renderers.NumericRenderer.apply(this, args);
        $(td).addClass('anggaran');
        $(td).removeClass('sum');
        if (isSum)
            $(td).addClass('sum');
        if (td.innerHTML && td.innerHTML.length > 0) {
            var length = td.innerHTML.length;
            td.innerHTML = "Rp. " + new Array(maxLength - length).join(" ") + td.innerHTML;
        }
        
        return td;
    }
}

export var anggaranRenderer=makeRupiahRenderer(15, 'awal');
export var anggaranPAKRenderer=makeRupiahRenderer(15, 'PAK');
export var perubahanRenderer=makeRupiahRenderer(15, 'perubahan');
export var anggaranSPPRenderer=makeRupiahRenderer(24, true, 1);
export var anggaranPenerimaanRenderer=makeRupiahRenderer(24, true, 1);
export var rupiahRenderer = makeRupiahRenderer(15, null);
export var rabRupiahRenderer = makeRupiahRenderer(15, null, 0, true);

export function anggaranValidator(value, callback) {
    var data = this.instance.getDataAtCol(this.col);
    var valid = true;
    if (this.instance.sumCounter && Number.isFinite(value) && value) {
        var code = this.instance.getDataAtCell(this.row, 0);
        if (code) {
            var sumValue = this.instance.sumCounter.sums[code];
            if (sumValue && value !== sumValue) {
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

    if (code && code.split) {
        code = (code.slice(-1) == '.') ? code.slice(0, -1) : code;
        level = code.split(".").length - 1;
    }
    td.style.paddingLeft = (3 + (level * 15)) + "px";
    return td;
}

export function uraianRABRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    var id  = instance.getDataAtCell(row, 0);
    var kode_rekening = instance.getDataAtCell(row, 1);
    var kode_kegiatan = instance.getDataAtCell(row, 2);    
    var level = 0;
    
    if (kode_rekening && kode_rekening.split) {
        kode_rekening = (kode_rekening.slice(-1) == '.') ? kode_rekening.slice(0, -1) : kode_rekening;

        if (kode_rekening.startsWith('5') && kode_rekening.length >= 3) 
            level = 1;

        if (kode_rekening.split(".").length != 1)
            level = kode_rekening.split(".").length + level;
        
        if(kode_rekening.split(".").length < 5 && col == 3){
            cellProperties.editor = false;
            //$(td).addClass('htDimmed');
        }
        else if(kode_rekening.split(".").length == 5 && kode_rekening.startsWith('5.1.3')){
            cellProperties.editor = 'text';
        }
    }

    if (kode_rekening == "" && kode_kegiatan != "") {
        kode_kegiatan = (kode_kegiatan.slice(-1) == '.') ? kode_kegiatan.slice(0, -1) : kode_kegiatan;
        level = (kode_kegiatan.split(".").length == 3) ? 1 : 2;

        cellProperties.editor = false;
    }
    td.style.paddingLeft = (0 + (level * 15)) + "px";

    if ( (kode_rekening == "" && kode_kegiatan != "") 
    || (kode_kegiatan == "" && kode_rekening && kode_rekening != "" && kode_rekening.split(".").length <= 2)){
        $(td).addClass('kegiatan');
    }

    return td;
}

export function uraianRenstraRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    var level = 5;
    var code = instance.getDataAtCell(row, 0);
    if (code && code.split) {
        code = code.replace(/[.]/g, '').match(/.{1,2}/g).join('.')
        level = code.split(".").length - 3;
    }
    td.style.paddingLeft = (4 + (level * 15)) + "px";

    unEditableRenderer(instance, td, row, col, prop, value, cellProperties);
    return td;
}

export function uraianPenerimaanRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    var level= 0;
    var code = instance.getDataAtCell(row, 1);
    if (code && code.split) {
        if(code.split('.').length == 5)
            level = 1;
    }
    td.style.paddingLeft = (4 + (level * 15)) + "px";
    return td;
}

export function uraianPenyetoranRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    var level= 0;
    var code = instance.getDataAtCell(row, 1);
    if (code && code.split) {
        if(code.search('TBP') !== -1)
            level = 1;
    }
    td.style.paddingLeft = (4 + (level * 15)) + "px";
    return td;
}

export function uraianSPPRenderer(instance, td, row, col, prop, value, cellProperties) {
    Handsontable.renderers.TextRenderer.apply(this, arguments);
    var level = 0;
    var code = instance.getDataAtCell(row, 1);

    if (code && code.split) {
        code = (code.slice(-1) == '.') ? code.slice(0, -1) : code;
        let dotCount = code.split(".").length;
        if(dotCount == 4 && code.startsWith('5.'))
            level = 0;
        else if ( dotCount == 4 && code.startsWith('7.'))
            level = 2;
        else 
            level = 1;
    }
    td.style.paddingLeft = (3 + (level * 15)) + "px";
    return td;
}

export function dateRenderer(instance, td, row, col, prop, value, cellProperties) {    
    if (cellProperties.readOnly)
        Handsontable.renderers.TextRenderer.apply(this, arguments);
    else
        Handsontable.renderers.AutocompleteRenderer.apply(this, arguments)

    var format = cellProperties.renderFormat || cellProperties.dateFormat || "";
    var val = $.datepicker.formatDate(format, new Date(value));
    td.innerHTML = val;    
    return td;
};

export function keyValuePairRenderer(instance, td, row, col, prop, value, cellProperties){
    let selectedId;
    let optionsList = cellProperties.originData;

    if(!optionsList)
        return td;
        
    let values = (value + "").split(",");
    value = [];

    for (var index = 0; index < optionsList.length; index++) {
        if (values.indexOf(optionsList[index].id + "") > -1) {
            selectedId = optionsList[index].id;
            value.push(optionsList[index].label);
        }
    }
    value = value.join(", ");
    
    Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties);
    return td;
}

export function rabUnEditableRenderer(instance, td, row, col, prop, value, cellProperties){
    Handsontable.renderers.TextRenderer.apply(this, arguments); 
    var kode_rekening = instance.getDataAtCell(row, 1);
    var indexSumsCounter = [7,11];

    kode_rekening = (kode_rekening && kode_rekening.slice(-1) == '.') ? kode_rekening.slice(0, -1) : kode_rekening;    

    if(kode_rekening && !kode_rekening.startsWith('5.')){
        cellProperties.editor = 'text';
        
        if(kode_rekening.split('.').length !== 5){           
            cellProperties.editor = false;
            unEditableRenderer(instance, td, row, col, prop, value, cellProperties);
        }
        else {
            if(cellProperties.editor){
                let editor = (col == 4) ? 'dropdown' : (indexSumsCounter.indexOf(col) !== -1)? 'numeric': 'text';
                cellProperties.editor = editor;            
            }            
        }

    }
    else {
        cellProperties.editor = 'text';
        var dotLength = (kode_rekening && kode_rekening.split('.')) ? kode_rekening.split('.').length : 0
        if(dotLength == 5 && !kode_rekening.startsWith('5.1.3')){
            if(cellProperties.editor){
                let editor = (col == 4) ? 'dropdown' : (indexSumsCounter.indexOf(col) !== -1)? 'numeric': 'text';
                cellProperties.editor = editor;            
            }  
            return td;
        }    
        if(dotLength == 6 && kode_rekening.startsWith('5.1.3')){
            if(cellProperties.editor){
                let editor = (col == 4) ? 'dropdown' : (indexSumsCounter.indexOf(col) !== -1)? 'numeric': 'text';
                cellProperties.editor = editor;            
            }  
            return td;
        }   
        cellProperties.editor = false;
        unEditableRenderer(instance, td, row, col, prop, value, cellProperties);
    }
    return td;
}

export function unEditableRenderer(instance, td, row, col, prop, value, cellProperties){
    if(!cellProperties.editor){
        $(td).addClass('htDimmed');
    }

    Handsontable.renderers.TextRenderer.apply(this, arguments);    
    return td;
}
