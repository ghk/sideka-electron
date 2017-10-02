var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');

let editors = {
    checkboxes: Handsontable.editors.BaseEditor.prototype.extend()
};

editors.checkboxes.prototype.init = function() {
    this.registerHooks();
}

editors.checkboxes.prototype.prepare = function() { 
    Handsontable.editors.BaseEditor.prototype.prepare.apply(this, arguments);
    
    let counter = 0;

    this.CHECKBOX_CONTAINER = document.createElement('div');
    this.CHECKBOX_CONTAINER.setAttribute('class', 'htSelectEditor');
    this.CHECKBOX_CONTAINER.style.background = '#fff';
    this.CHECKBOX_CONTAINER.style.border = '1px solid black';
    this.CHECKBOX_CONTAINER.style.display = 'none';
    
    this.CHECKBOXES = [];

    this.cellProperties.options.forEach(option => {
        this['CHECKBOX-' + counter] = document.createElement('input');
        this['CHECKBOX-' + counter].setAttribute('type', 'checkbox');
        this['CHECKBOX-' + counter].setAttribute('id', 'opt-' + option);
        this['CHECKBOX-' + counter].setAttribute('value', option);
        this['CHECKBOX-' + counter].style.marginLeft = '10px';

        let LABEL = document.createElement('label');
        LABEL.setAttribute('for', 'opt-' + option);
        LABEL.textContent = option;
        
        this.CHECKBOX_CONTAINER.appendChild(this['CHECKBOX-' + counter]);
        this.CHECKBOX_CONTAINER.appendChild(LABEL);

        this.CHECKBOXES.push(this['CHECKBOX-' + counter]);
        counter++;
    });
    
    this.CHECKBOX_CONTAINER.setAttribute('class', 'handsontableInputHolder');
    this.instance.rootElement.appendChild(this.CHECKBOX_CONTAINER);
}

editors.checkboxes.prototype.open = function() {
    this._opened = true;
    this.refreshDimensions();
    this.CHECKBOX_CONTAINER.style.display = '';
}

editors.checkboxes.prototype.close = function() {
    this._opened = false;
    this.CHECKBOX_CONTAINER.style.display = 'none';
}

editors.checkboxes.prototype.focus = function() {
    this.CHECKBOX_CONTAINER.focus();
}

editors.checkboxes.prototype.getValue = function() {
    let result = '';

    for(let i=0; i<this.CHECKBOXES.length; i++) {
        let element = this.CHECKBOXES[i];

        if(element.checked)
            result += element.defaultValue + ', ';
    }

    return result.substr(0, result.length - 2);
}

editors.checkboxes.prototype.setValue = function(value) {
    let values = value.split(',');
    
    values.forEach(data => {
        let element = this.CHECKBOXES.filter(e => e.id === 'opt-' + data.trim())[0];

        if(element)
            element.checked = true;
    });
}

editors.checkboxes.prototype.checkEditorSection = function() {
    let totalRows = this.instance.countRows();
    let section = '';

    if (this.row < this.instance.getSettings().fixedRowsTop) {
        if (this.col < this.instance.getSettings().fixedColumnsLeft) 
          section = 'top-left-corner';
        else 
          section = 'top';
    } 
    else if (this.instance.getSettings().fixedRowsBottom && this.row >= totalRows - this.instance.getSettings().fixedRowsBottom) {
        if (this.col < this.instance.getSettings().fixedColumnsLeft) 
            section = 'bottom-left-corner';
        else 
            section = 'bottom';
    } 
    else {
      if (this.col < this.instance.getSettings().fixedColumnsLeft) 
        section = 'left';  
    }

    return section;
}

editors.checkboxes.prototype.registerHooks = function() {
    let me = this;

    this.instance.addHook('afterScrollHorizontally', (function() {
        return me.refreshDimensions();
    }));
    this.instance.addHook('afterScrollVertically', (function() {
        return me.refreshDimensions();
    }));
    this.instance.addHook('afterColumnResize', (function() {
        return me.refreshDimensions();
    }));
    this.instance.addHook('afterRowResize', (function() {
        return me.refreshDimensions();
    }));
}

editors.checkboxes.prototype.refreshDimensions = function() {
    if (this.state !== Handsontable.EditorState.EDITING) 
        return;
    
    this.TD = this.getEditedCell();

    if (!this.TD) {
        this.close();
        return;
    }

    let width = Handsontable.Dom.outerWidth(this.TD) + 1,
      height = Handsontable.Dom.outerHeight(this.TD) + 1,
      currentOffset = Handsontable.Dom.offset(this.TD),
      containerOffset = Handsontable.Dom.offset(this.instance.rootElement),
      scrollableContainer = Handsontable.Dom.getScrollableElement(this.TD),
      editTop = currentOffset.top - containerOffset.top - 1 - (scrollableContainer.scrollTop || 0),
      editLeft = currentOffset.left - containerOffset.left - 1 - (scrollableContainer.scrollLeft || 0),
      editorSection = this.checkEditorSection(),
      cssTransformOffset;
    
    let settings = this.instance.getSettings();
    let rowHeadersCount = settings.rowHeaders ? 1 : 0;
    let colHeadersCount = settings.colHeaders ? 1 : 0;

    switch (editorSection) {
        case 'top':
        cssTransformOffset = Handsontable.Dom.getCssTransform(this.instance.view.wt.wtOverlays.topOverlay.clone.wtTable.holder.parentNode);
        break;
        case 'left':
        cssTransformOffset = Handsontable.Dom.getCssTransform(this.instance.view.wt.wtOverlays.leftOverlay.clone.wtTable.holder.parentNode);
        break;
        case 'top-left-corner':
        cssTransformOffset = Handsontable.Dom.getCssTransform(this.instance.view.wt.wtOverlays.topLeftCornerOverlay.clone.wtTable.holder.parentNode);
        break;
        case 'bottom-left-corner':
        cssTransformOffset = Handsontable.Dom.getCssTransform(this.instance.view.wt.wtOverlays.bottomLeftCornerOverlay.clone.wtTable.holder.parentNode);
        break;
        case 'bottom':
        cssTransformOffset = Handsontable.Dom.getCssTransform(this.instance.view.wt.wtOverlays.bottomOverlay.clone.wtTable.holder.parentNode);
        break;
    }

    if (this.instance.getSelected()[0] === 0) 
        editTop += 1;
    
    if (this.instance.getSelected()[1] === 0) 
        editLeft += 1;
    
    let style = this.CHECKBOX_CONTAINER.style;

    if (cssTransformOffset && cssTransformOffset != -1) 
        style[cssTransformOffset[0]] = cssTransformOffset[1];
    else 
        Handsontable.Dom.resetCssTransform(this.CHECKBOX_CONTAINER);
    
    let cellComputedStyle = getComputedStyle(this.TD);

    if (parseInt(cellComputedStyle.borderTopWidth, 10) > 0) 
        height -= 1;
    
    if (parseInt(cellComputedStyle.borderLeftWidth, 10) > 0) 
        width -= 1;
    
    style.height = height + 'px';
    style.minWidth = width + 'px';
    style.top = editTop + 'px';
    style.left = editLeft + 'px';
    style.margin = '0px';
}

editors.checkboxes.prototype.getEditedCell = function() {
    let editorSection = this.checkEditorSection();
    let editedCell;

    switch (editorSection) {
        case 'top':
            editedCell = this.instance.view.wt.wtOverlays.topOverlay.clone.wtTable.getCell({
                row: this.row,
                col: this.col
            });
            this.CHECKBOX_CONTAINER.style.zIndex = 101;
        break;
        case 'corner':
            editedCell = this.instance.view.wt.wtOverlays.topLeftCornerOverlay.clone.wtTable.getCell({
                row: this.row,
                col: this.col
            });
            this.CHECKBOX_CONTAINER.style.zIndex = 103;
        break;
        case 'left':
            editedCell = this.instance.view.wt.wtOverlays.leftOverlay.clone.wtTable.getCell({
                row: this.row,
                col: this.col
            });
            this.CHECKBOX_CONTAINER.style.zIndex = 102;
        break;
        default:
            editedCell = this.instance.getCell(this.row, this.col);
            this.CHECKBOX_CONTAINER.style.zIndex = '';
        break;
    }

    return editedCell != -1 && editedCell != -2 ? editedCell : void 0;
}

export default editors;