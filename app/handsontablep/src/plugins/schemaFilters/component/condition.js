import {addClass} from 'handsontable/helpers/dom/element';
import {stopImmediatePropagation} from 'handsontable/helpers/dom/event';
import {arrayEach, arrayFilter, arrayMap} from 'handsontable/helpers/array';
import {extend} from 'handsontable/helpers/object';
import {isKey} from 'handsontable/helpers/unicode';
import {BaseComponent} from './_base';
import {getOptionsList, FORMULA_NONE, FORMULA_BY_VALUE} from './../constants';
import {InputUI} from './../ui/input';
import {SelectUI} from './../ui/select';
import {getFormulaDescriptor} from './../formulaRegisterer';

/**
 * @class ConditionComponent
 * @plugin Filters
 */
class ConditionComponent extends BaseComponent {
  constructor(hotInstance) {
    super(hotInstance);

    this.elements.push(new SelectUI(this.hot));
    this.elements.push(new InputUI(this.hot, {placeholder: 'Value'}));
    this.elements.push(new InputUI(this.hot, {placeholder: 'Second value'}));
    this.elements.push(new SelectUI(this.hot));

    this.registerHooks();
  }

  /**
   * Register all necessary hooks.
   *
   * @private
   */
  registerHooks() {
    this.getSelectElement().addLocalHook('select', (command) => this.onConditionSelect(command));

    arrayEach(this.getInputElements(), (input) => {
      input.addLocalHook('keydown', (event) => this.onInputKeyDown(event));
    });
  }

  /**
   * Set state of the component.
   *
   * @param {Object} value State to restore.
   */
  setState(value) {
    this.reset();

    if (value) {
      this.getSelectElement().setValue(value.command);
      let shownInputs = this.getShownInputs(value.command);
      arrayEach(value.args, (arg, index) => {
        let element = this.getAllInputElements()[index];

        if (index === 2) {
          arg = element.items.filter(i => i.key.toLowerCase() === arg.toLowerCase())[0];
        }
        element.setValue(arg);

        let shown = shownInputs.indexOf(index) !== -1;
        element[shown ? 'show' : 'hide']();

        if (!index) {
          setTimeout(() => element.focus(), 10);
        }
      });
      this.setPlaceholders(value.command);
    }
  }

  setPlaceholders(command) {
    let placeholders = ['', ''];
    if (command.inputPlaceholders) {
      placeholders = command.inputPlaceholders;
    }
    arrayEach(this.getInputElements(), (element, index) => {
      element.options.placeholder = placeholders[index];
      element.element.getElementsByTagName('input')[0].placeholder = placeholders[index];
    });
  }

  getShownInputs(command) {
    let columnIndex = this.hot.getSelected();
    if (columnIndex) {
      columnIndex = columnIndex[1];
    } else {
      columnIndex = this.hot.getPlugin('filters').getSelectedColumn();
    }
    let columnType = this.hot.getDataType.apply(this.hot, [0, columnIndex]);
    const dropdownFormulas = ['eq', 'neq'];
    if (columnType === 'dropdown' && dropdownFormulas.indexOf(command.key) !== -1) {
      return [2];
    }
    var results = [];
    for (var i = 0; i < command.inputsCount; i++) {
      results.push(i);
    }
    return results;
  }

  /**
   * Export state of the component (get selected filter and filter arguments).
   *
   * @returns {Object} Returns object where `command` key keeps used formula filter and `args` key its arguments.
   */
  getState() {
    const command = this.getSelectElement().getValue() || getFormulaDescriptor(FORMULA_NONE);
    let args = [];

    arrayEach(this.getInputElements(), (element, index) => {
      //if (command.inputsCount > index) {
      args.push(element.getValue());
      //}
    });
    let dropdownValue = this.getDropdownSelectElement().getValue();
    if (dropdownValue) {
      dropdownValue = dropdownValue.key;
    }
    args.push(dropdownValue);

    return {
      command,
      args,
    };
  }

  /**
   * Update state of component.
   *
   * @param {Object} editedFormulaStack Formula stack for edited column.
   */
  updateState({column, formulas: currentFormulas}) {
    const [formula] = arrayFilter(currentFormulas, formula => formula.name !== FORMULA_BY_VALUE);

    // Ignore formulas by_value
    if (formula && formula.name === FORMULA_BY_VALUE) {
      return;
    }

    this.setCachedState(column, {
      command: formula ? getFormulaDescriptor(formula.name) : getFormulaDescriptor(FORMULA_NONE),
      args: formula ? formula.args : [],
    });
  }

  /**
   * Get select element.
   *
   * @returns {SelectUI}
   */
  getSelectElement() {
    return this.elements.filter((element) => element instanceof SelectUI)[0];
  }

  /**
   * Get dropdown select element.
   *
   * @returns {SelectUI}
   */
  getDropdownSelectElement() {
    return this.elements.filter((element) => element instanceof SelectUI)[1];
  }

  /**
   * Get input element.
   *
   * @param {Number} index Index an array of elements.
   * @returns {InputUI}
   */
  getInputElement(index = 0) {
    return this.getInputElements()[index];
  }

  /**
   * Get input elements.
   *
   * @returns {Array}
   */
  getInputElements() {
    return this.elements.filter((element) => element instanceof InputUI);
  }

  /**
   * Get all input elements.
   *
   * @returns {Array}
   */
  getAllInputElements() {
    return this.elements.filter((element, index) => index > 0);
  }

  /**
   * Get menu object descriptor.
   *
   * @returns {Object}
   */
  getMenuItemDescriptor() {
    return {
      key: 'filter_by_condition',
      name: '',
      isCommand: false,
      disableSelection: true,
      hidden: () => this.isHidden(),
      renderer: (hot, wrapper, row, col, prop, value) => {
        addClass(wrapper.parentNode, 'htFiltersMenuCondition');

        let label = document.createElement('div');

        addClass(label, 'htFiltersMenuLabel');
        label.textContent = 'Saring yang:';

        wrapper.appendChild(label);
        arrayEach(this.elements, (ui) => wrapper.appendChild(ui.element));

        return wrapper;
      }
    };
  }

  /**
   * Reset elements to their initial state.
   */
  reset() {
    let lastSelectedColumn = this.hot.getPlugin('filters').getSelectedColumn();
    let columnType = this.hot.getDataType.apply(this.hot, this.hot.getSelected() || [0, lastSelectedColumn]);
    let items = getOptionsList(columnType);

    arrayEach(this.getAllInputElements(), (element) => element.hide());
    this.getSelectElement().setItems(items);

    super.reset();

    if (columnType === 'dropdown') {
      let column = this.hot.getSelected();
      if (column) {
        column = column[1];
      } else {
        column = lastSelectedColumn;
      }
      let source = this.hot.getCellMeta(0, column).source;
      if (source) {
        let sourceItems = arrayMap(source, s => { return {key: s, name:s }; });
        this.getDropdownSelectElement().setItems(sourceItems);
        this.getDropdownSelectElement().setValue(sourceItems[0]);
      }
    }

    // Select element as default 'None'
    this.getSelectElement().setValue(items[0]);
  }

  /**
   * On condition select listener.
   *
   * @private
   * @param {Object} command Menu item object (command).
   */
  onConditionSelect(command) {
    let shownInputs = this.getShownInputs(command);
    arrayEach(this.getAllInputElements(), (element, index) => {
      let shown = shownInputs.indexOf(index) !== -1;
      element[shown ? 'show' : 'hide']();

      if (!index) {
        setTimeout(() => element.focus(), 10);
      }
    });
    this.setPlaceholders(command);
  }

  /**
   * Key down listener.
   *
   * @private
   * @param {Event} event DOM event object.
   */
  onInputKeyDown(event) {
    if (isKey(event.keyCode, 'ENTER')) {
      this.runLocalHooks('accept');
      stopImmediatePropagation(event);

    } else if (isKey(event.keyCode, 'ESCAPE')) {
      this.runLocalHooks('cancel');
      stopImmediatePropagation(event);
    }
  }
}

export {ConditionComponent};
