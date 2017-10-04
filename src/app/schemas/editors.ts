var Handsontable = require('../lib/handsontablep/dist/handsontable.full.js');

var $ = require('jquery');
window['$'] = $;
window['jQuery'] = $;

var chosen = require('chosen-jquery/lib/chosen.jquery.js');

let editors = {
    checkboxes: Handsontable.editors.BaseEditor.prototype.extend(),
    chosen: Handsontable.editors.TextEditor.prototype.extend()
};

//CHOSEN
editors.chosen.prototype.prepare = function (row, col, prop, td, originalValue, cellProperties) {
      Handsontable.editors.TextEditor.prototype.prepare.apply(this, arguments);

      this.options = {};

      if (this.cellProperties.chosenOptions) {
          this.options = $.extend(this.options, cellProperties.chosenOptions);
      }

      cellProperties.chosenOptions = $.extend({}, cellProperties.chosenOptions);
};

editors.chosen.prototype.createElements = function () {
      this.$body = $(document.body);

      this.TEXTAREA = document.createElement('select');
      //this.TEXTAREA.setAttribute('type', 'text');
      this.$textarea = $(this.TEXTAREA);

      Handsontable.dom.addClass(this.TEXTAREA, 'handsontableInput');

      this.textareaStyle = this.TEXTAREA.style;
      this.textareaStyle.width = 0;
      this.textareaStyle.height = 0;

      this.TEXTAREA_PARENT = document.createElement('DIV');
      Handsontable.dom.addClass(this.TEXTAREA_PARENT, 'handsontableInputHolder');

      this.textareaParentStyle = this.TEXTAREA_PARENT.style;
      this.textareaParentStyle.top = 0;
      this.textareaParentStyle.left = 0;
      this.textareaParentStyle.display = 'none';
      this.textareaParentStyle.width = "200px";

      this.TEXTAREA_PARENT.appendChild(this.TEXTAREA);

      this.instance.rootElement.appendChild(this.TEXTAREA_PARENT);

      var that = this;
      this.instance._registerTimeout(setTimeout(function () {
          that.refreshDimensions();
      }, 0));
  };

  var onChosenChanged = function () {
      var options = this.cellProperties.chosenOptions;

      if (!options.multiple) {
          this.close();
          this.finishEditing();
      }
  };
  var onChosenClosed = function () {
      var options = this.cellProperties.chosenOptions;

      if (!options.multiple) {
          this.close();
          this.finishEditing();
      } else {
      }
  };
  var onBeforeKeyDown = function (event) {
      var instance = this;
      var that = instance.getActiveEditor();

      var keyCodes = Handsontable.helper.KEY_CODES;
      var ctrlDown = (event.ctrlKey || event.metaKey) && !event.altKey; //catch CTRL but not right ALT (which in some systems triggers ALT+CTRL)

      //Process only events that have been fired in the editor
      if (event.target.tagName !== "INPUT") {
          return;
      }
      if (event.keyCode === 17 || event.keyCode === 224 || event.keyCode === 91 || event.keyCode === 93) {
          //when CTRL or its equivalent is pressed and cell is edited, don't prepare selectable text in textarea
          event.stopImmediatePropagation();
          return;
      }

      var target = event.target;

      switch (event.keyCode) {
          case keyCodes.ARROW_RIGHT:
              if (Handsontable.dom.getCaretPosition(target) !== target.value.length) {
                  event.stopImmediatePropagation();
              } else {
                  that.$textarea.trigger("chosen:close");
              }
              break;

          case keyCodes.ARROW_LEFT:
              if (Handsontable.dom.getCaretPosition(target) !== 0) {
                  event.stopImmediatePropagation();
              } else {
                  that.$textarea.trigger("chosen:close");
              }
              break;

          case keyCodes.ENTER:
              if (that.cellProperties.chosenOptions.multiple) {
                  event.stopImmediatePropagation();
                  event.preventDefault();
                  event.stopPropagation();
              }

              break;

          case keyCodes.A:
          case keyCodes.X:
          case keyCodes.C:
          case keyCodes.V:
              if (ctrlDown) {
                  event.stopImmediatePropagation(); //CTRL+A, CTRL+C, CTRL+V, CTRL+X should only work locally when cell is edited (not in table context)
              }
              break;

          case keyCodes.BACKSPACE:
              var txt = $(that.TEXTAREA_PARENT).find("input").val();
              $(that.TEXTAREA_PARENT).find("input").val(txt.substr(0,txt.length-1)).trigger("keyup.chosen");

              event.stopImmediatePropagation();
              break;
          case keyCodes.DELETE:
          case keyCodes.HOME:
          case keyCodes.END:
              event.stopImmediatePropagation(); //backspace, delete, home, end should only work locally when cell is edited (not in table context)
              break;
      }

  };


editors.chosen.prototype.open = function (keyboardEvent) {
    this.refreshDimensions();
    this.textareaParentStyle.display = 'block';
    this.instance.addHook('beforeKeyDown', onBeforeKeyDown);

    this.$textarea.css({
        height: $(this.TD).height() + 4,
        'min-width': $(this.TD).outerWidth() - 4
    });

    //display the list
    this.$textarea.hide();

    //make sure that list positions matches cell position
    //this.$textarea.offset($(this.TD).offset());

    var options = $.extend({}, this.options, {
        width: "100%",
        search_contains: true
    });

    if (options.multiple) {
        this.$textarea.attr("multiple", true);
    } else {
        this.$textarea.attr("multiple", false);
    }

    this.$textarea.empty();
    this.$textarea.append("<option value=''></option>");
    var el = null;
    var originalValue = (this.originalValue + "").split(",");
    if (options.data && options.data.length) {
        for (var i = 0; i < options.data.length; i++) {
            el = $("<option />");
            el.attr("value", options.data[i].id);
            el.html(options.data[i].label);

            if (originalValue.indexOf(options.data[i].id + "") > -1) {
                el.attr("selected", true);
            }

            this.$textarea.append(el);
        }
    }

    if ($(this.TEXTAREA_PARENT).find(".chosen-container").length) {
        this.$textarea.chosen("destroy");
    }

    this.$textarea.chosen(options);
    console.log(this.$textarea);

    var self = this;
    setTimeout(function () {

        self.$textarea.on('change', onChosenChanged.bind(self));
        self.$textarea.on('chosen:hiding_dropdown', onChosenClosed.bind(self));

        self.$textarea.trigger("chosen:open");

        $(self.TEXTAREA_PARENT).find("input").on("keydown", function(e) {
            if(e.keyCode === Handsontable.helper.KEY_CODES.ENTER /*|| e.keyCode === Handsontable.helper.KEY_CODES.BACKSPACE*/) {
                if($(this).val()) {
                    e.preventDefault();
                    e.stopPropagation();
                } else {
                    e.preventDefault();
                    e.stopPropagation();

                    self.close();
                    self.finishEditing();
                }

            }

            if( e.keyCode === Handsontable.helper.KEY_CODES.BACKSPACE) {
                var txt =  $(self.TEXTAREA_PARENT).find("input").val();

                $(self.TEXTAREA_PARENT).find("input").val(txt.substr(0,txt.length-1)).trigger("keyup.chosen");

                e.preventDefault();
                e.stopPropagation();
            }

            if(e.keyCode === Handsontable.helper.KEY_CODES.ARROW_DOWN || e.keyCode === Handsontable.helper.KEY_CODES.ARROW_UP) {
                e.preventDefault();
                e.stopPropagation();
            }

        });

        setTimeout(function () {
            self.$textarea.trigger("chosen:activate").focus();

            if (keyboardEvent && keyboardEvent.keyCode && keyboardEvent.keyCode != 113) {
                var key = keyboardEvent.keyCode;
                var keyText = (String.fromCharCode((96 <= key && key <= 105) ? key - 48 : key)).toLowerCase();

                $(self.TEXTAREA_PARENT).find("input").val(keyText).trigger("keyup.chosen");
                self.$textarea.trigger("chosen:activate");
            }
        }, 1);
    }, 1);

};

editors.chosen.prototype.init = function () {
    Handsontable.editors.TextEditor.prototype.init.apply(this, arguments);
};

editors.chosen.prototype.close = function () {
    this.instance.listen();
    this.instance.removeHook('beforeKeyDown', onBeforeKeyDown);
    this.$textarea.off();
    this.$textarea.hide();
    Handsontable.editors.TextEditor.prototype.close.apply(this, arguments);
};

editors.chosen.prototype.getValue = function() {
    if(!this.$textarea.val()) {
        return "";
    }
    if(typeof this.$textarea.val() === "object") {
        return this.$textarea.val().join(",");
    }
    return this.$textarea.val();
};


editors.chosen.prototype.focus = function () {
    this.instance.listen();

    // DO NOT CALL THE BASE TEXTEDITOR FOCUS METHOD HERE, IT CAN MAKE THIS EDITOR BEHAVE POORLY AND HAS NO PURPOSE WITHIN THE CONTEXT OF THIS EDITOR
    //Handsontable.editors.TextEditor.prototype.focus.apply(this, arguments);
};

editors.chosen.prototype.beginEditing = function (initialValue) {
    var onBeginEditing = this.instance.getSettings().onBeginEditing;
    if (onBeginEditing && onBeginEditing() === false) {
        return;
    }

    Handsontable.editors.TextEditor.prototype.beginEditing.apply(this, arguments);

};

editors.chosen.prototype.finishEditing = function (isCancelled, ctrlDown) {
    this.instance.listen();
    return Handsontable.editors.TextEditor.prototype.finishEditing.apply(this, arguments);
};


//CHECKBOXES
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
