import BasePlugin from 'handsontable/plugins/_base.js';
import {deepClone, objectEach} from 'handsontable/helpers/object';
import {arrayEach} from 'handsontable/helpers/array';
import {registerPlugin, getPlugin} from 'handsontable/plugins.js';

/**
 * @plugin ColumnSummary
 * @pro
 *
 * @description
 * Allows making pre-defined calculations on the cell values and display the results within Handsontable.
 * See the demo for more information.
 */
class ColumnSummary extends BasePlugin {
  constructor(hotInstance) {
    super(hotInstance);

    /**
     * Array of declared plugin endpoints (calculation destination points).
     *
     * @type {Array}
     * @default {Array} Empty array.
     */
    this.endpoints = [];
    /**
     * The plugin settings, taken from Handsontable configuration.
     *
     * @type {Object}
     * @default null
     */
    this.settings = null;
    /**
     * The current endpoint (calculation destination point) in question.
     *
     * @type {Object}
     * @default null
     */
    this.currentEndpoint = null;
  }

  /**
   * Check if plugin is enabled.
   *
   * @returns {Boolean}
   */
  isEnabled() {
    return !!this.hot.getSettings().columnSummary;
  }

  /**
   * Enable plugin for this Handsontable instance.
   */
  enablePlugin() {
    if (this.enabled) {
      return;
    }

    this.settings = this.hot.getSettings().columnSummary;

    this.hot.addHook('afterInit', () => this.onAfterInit());
    this.hot.addHook('afterChange', (changes, source) => this.onAfterChange(changes, source));
    this.hot.addHook('afterCreateRow', (index, num, auto) => this.resetSetupAfterStructureAlteration('insert_row', index, num, auto));
    this.hot.addHook('afterCreateCol', (index, num, auto) => this.resetSetupAfterStructureAlteration('insert_col', index, num, auto));
    this.hot.addHook('afterRemoveRow', (index, num, auto) => this.resetSetupAfterStructureAlteration('remove_row', index, num, auto));
    this.hot.addHook('afterRemoveCol', (index, num, auto) => this.resetSetupAfterStructureAlteration('remove_col', index, num, auto));

    super.enablePlugin();
  }

  /**
   * Disable the plugin.
   */
  disablePlugin() {
    this.endpoints = null;
    this.settings = null;
    this.currentEndpoint = null;
  }

  /**
   * afterCreateRow/afterCreateRow/afterRemoveRow/afterRemoveCol hook callback. Reset and reenables the summary functionality
   * after changing the table structure.
   *
   * @private
   * @param action {String}
   * @param index {Number}
   * @param number {Number}
   * @param createdAutomatically {Boolean}
   */
  resetSetupAfterStructureAlteration(action, index, number, createdAutomatically) {
    if (createdAutomatically) {
      return;
    }

    let type = action.indexOf('row') > -1 ? 'row' : 'col';
    let oldEndpoints = deepClone(this.endpoints);

    objectEach(oldEndpoints, (val, key, obj) => {
      if (type === 'row' && val.destinationRow >= index) {
        if (action === 'insert_row') {
          val.alterRowOffset = number;
        } else if (action === 'remove_row') {
          val.alterRowOffset = (-1) * number;
        }
      }

      if (type === 'col' && val.destinationColumn >= index) {
        if (action === 'insert_col') {
          val.alterColumnOffset = number;
        } else if (action === 'remove_col') {
          val.alterColumnOffset = (-1) * number;
        }
      }
    });

    this.endpoints = [];
    this.resetAllEndpoints(oldEndpoints);
    this.parseSettings();

    objectEach(this.endpoints, (val, key, obj) => {
      if (type === 'row' && val.destinationRow >= index) {
        if (action === 'insert_row') {
          val.alterRowOffset = number;
        } else if (action === 'remove_row') {
          val.alterRowOffset = (-1) * number;
        }
      }

      if (type === 'col' && val.destinationColumn >= index) {
        if (action === 'insert_col') {
          val.alterColumnOffset = number;
        } else if (action === 'remove_col') {
          val.alterColumnOffset = (-1) * number;
        }
      }
    });

    this.refreshAllEndpoints(true);
  }

  /**
   * afterInit hook callback.
   *
   * @private
   */
  onAfterInit() {
    this.parseSettings(this.settings);
    this.refreshAllEndpoints(true);
  }

  /**
   * afterChange hook callback.
   *
   * @private
   * @param {Array} changes
   * @param {String} source
   */
  onAfterChange(changes, source) {
    if (changes && source !== 'columnSummary' && source !== 'loadData') {
      this.refreshChangedEndpoints(changes);
    }
  }

  /**
   * Parse plugin's settings.
   */
  parseSettings() {
    objectEach(this.settings, (val, key, obj) => {
      let newEndpoint = {};

      this.assignSetting(val, newEndpoint, 'ranges', [[0, this.hot.countRows() - 1]]);
      this.assignSetting(val, newEndpoint, 'reversedRowCoords', false);
      this.assignSetting(val, newEndpoint, 'destinationRow', new Error('You must provide a destination row for the Column Summary plugin in order to work properly!'));
      this.assignSetting(val, newEndpoint, 'destinationColumn', new Error('You must provide a destination column for the Column Summary plugin in order to work properly!'));
      this.assignSetting(val, newEndpoint, 'sourceColumn', val.destinationColumn);
      this.assignSetting(val, newEndpoint, 'type', 'sum');
      this.assignSetting(val, newEndpoint, 'forceNumeric', false);
      this.assignSetting(val, newEndpoint, 'suppressDataTypeErrors', true);
      this.assignSetting(val, newEndpoint, 'suppressDataTypeErrors', true);
      this.assignSetting(val, newEndpoint, 'customFunction', null);
      this.assignSetting(val, newEndpoint, 'readOnly', true);
      this.assignSetting(val, newEndpoint, 'roundFloat', false);

      this.endpoints.push(newEndpoint);
    });
  }

  /**
   * Setter for the internal setting objects.
   *
   * @param {Object} settings Object with the settings.
   * @param {Object} endpoint Contains information about the endpoint for the the calculation.
   * @param {String} name Settings name.
   * @param defaultValue Default value for the settings.
   */
  assignSetting(settings, endpoint, name, defaultValue) {
    if (name === 'ranges' && settings[name] === void 0) {
      endpoint[name] = defaultValue;
      return;
    } else if (name === 'ranges' && settings[name].length === 0) {
      return;
    }

    if (settings[name] === void 0) {
      if (defaultValue instanceof Error) {
        throw defaultValue;

      }

      endpoint[name] = defaultValue;

    } else {
      if (name === 'destinationRow' && endpoint.reversedRowCoords) {
        endpoint[name] = this.hot.countRows() - settings[name] - 1;

      } else {
        endpoint[name] = settings[name];
      }
    }
  }

  /**
   * Do the math for a single endpoint.
   *
   * @param {Object} endpoint Contains information about the endpoint.
   */
  calculate(endpoint) {
    switch (endpoint.type.toLowerCase()) {
      case 'sum':
        endpoint.result = this.calculateSum(endpoint);
        break;
      case 'min':
        endpoint.result = this.calculateMinMax(endpoint, endpoint.type);
        break;
      case 'max':
        endpoint.result = this.calculateMinMax(endpoint, endpoint.type);
        break;
      case 'count':
        endpoint.result = this.countEntries(endpoint);
        break;
      case 'average':
        endpoint.result = this.calculateAverage(endpoint);
        break;
      case 'custom':
        endpoint.result = endpoint.customFunction.call(this, endpoint);
        break;
    }
  }

  /**
   * Resets (removes) the endpoints from the table.
   *
   * @param {Array} endpoints Array containing the endpoints.
   */
  resetAllEndpoints(endpoints) {
    if (!endpoints) {
      endpoints = this.endpoints;
    }

    arrayEach(endpoints, (value) => {
      this.resetEndpointValue(value);
    });
  }

  /**
   * Calculate and refresh all defined endpoints.
   *
   * @param {Boolean} init `true` if it's the initial call.
   */
  refreshAllEndpoints(init) {
    arrayEach(this.endpoints, (value) => {
      this.currentEndpoint = value;
      this.calculate(value);
      this.setEndpointValue(value, 'init');
    });
    this.currentEndpoint = null;
  }

  /**
   * Calculate and refresh endpoints only in the changed columns.
   *
   * @param {Array} changes Array of changes from the `afterChange` hook.
   */
  refreshChangedEndpoints(changes) {
    let needToRefresh = [];

    arrayEach(changes, (value, key, changes) => {
      // if nothing changed, dont update anything
      if ((value[2] || '') + '' === value[3] + '') {
        return;
      }

      arrayEach(this.endpoints, (value, j) => {
        if (this.hot.propToCol(changes[key][1]) === value.sourceColumn && needToRefresh.indexOf(j) === -1) {
          needToRefresh.push(j);
        }
      });
    });

    arrayEach(needToRefresh, (value) => {
      this.refreshEndpoint(this.endpoints[value]);
    });
  }

  /**
   * Calculate and refresh a single endpoint.
   *
   * @param {Object} endpoint Contains the endpoint information.
   */
  refreshEndpoint(endpoint) {
    this.currentEndpoint = endpoint;
    this.calculate(endpoint);
    this.setEndpointValue(endpoint);
    this.currentEndpoint = null;
  }

  /**
   * Reset the endpoint value.
   *
   * @param {Object} endpoint Contains the endpoint information.
   */
  resetEndpointValue(endpoint) {
    let alterRowOffset = endpoint.alterRowOffset || 0;
    let alterColOffset = endpoint.alterColumnOffset || 0;

    if (endpoint.destinationRow + alterRowOffset > this.hot.countRows() ||
        endpoint.destinationColumn + alterColOffset > this.hot.countCols()) {
      this.throwOutOfBoundsWarning();
      return;
    }

    this.hot.setCellMeta(endpoint.destinationRow, endpoint.destinationColumn, 'readOnly', false);
    this.hot.setCellMeta(endpoint.destinationRow, endpoint.destinationColumn, 'className', '');
    this.hot.setDataAtCell(endpoint.destinationRow + alterRowOffset, endpoint.destinationColumn + alterColOffset, '', 'columnSummary');
  }

  /**
   * Set the endpoint value.
   *
   * @param {Object} endpoint Contains the endpoint information.
   * @param {String} [source] Source of the call information.
   */
  setEndpointValue(endpoint, source) {
    let alterRowOffset = endpoint.alterRowOffset || 0;
    let alterColumnOffset = endpoint.alterColumnOffset || 0;

    let rowOffset = Math.max(-alterRowOffset, 0);
    let colOffset = Math.max(-alterColumnOffset, 0);

    if (endpoint.destinationRow + rowOffset > this.hot.countRows() ||
        endpoint.destinationColumn + colOffset > this.hot.countCols()) {
      this.throwOutOfBoundsWarning();
      return;
    }

    if (source === 'init') {
      this.hot.setCellMeta(endpoint.destinationRow + rowOffset, endpoint.destinationColumn + colOffset, 'readOnly', endpoint.readOnly);
      this.hot.setCellMeta(endpoint.destinationRow + rowOffset, endpoint.destinationColumn + colOffset, 'className', 'columnSummaryResult');
    }

    if (endpoint.roundFloat && !isNaN(endpoint.result)) {
      endpoint.result = endpoint.result.toFixed(endpoint.roundFloat);
    }

    this.hot.setDataAtCell(endpoint.destinationRow, endpoint.destinationColumn, endpoint.result, 'columnSummary');

    endpoint.alterRowOffset = void 0;
    endpoint.alterColOffset = void 0;
  }

  throwOutOfBoundsWarning() {
    console.warn('One of the  Column Summary plugins\' destination points you provided is beyond the table boundaries!');
  }

  /**
   * Calculate sum of the values contained in ranges provided in the plugin config.
   *
   * @param {Object} endpoint Contains the endpoint information.
   * @returns {Number} Sum for the selected range
   */
  calculateSum(endpoint) {
    let sum = 0;

    for (let r in endpoint.ranges) {
      if (endpoint.ranges.hasOwnProperty(r)) {
        sum += this.getPartialSum(endpoint.ranges[r], endpoint.sourceColumn);
      }
    }

    return sum;
  }

  /**
   * Get partial sum of values from a single row range
   *
   * @param {Array} rowRange Range for the sum.
   * @param {Number} col Column index.
   * @returns {Number} The partial sum.
   */
  getPartialSum(rowRange, col) {
    let sum = 0;
    let i = rowRange[1] || rowRange[0];

    do {
      sum += this.getCellValue(i, col) || 0;
      i--;
    } while (i >= rowRange[0]);

    return sum;
  }

  /**
   * Calculate the minimal value for the selected ranges
   *
   * @param {Object} endpoint Contains the endpoint information.
   * @param {String} type `'min'` or `'max'`.
   * @returns {Number} Min or Max value.
   */
  calculateMinMax(endpoint, type) {
    let result = null;

    for (let r in endpoint.ranges) {
      if (endpoint.ranges.hasOwnProperty(r)) {
        let partialResult = this.getPartialMinMax(endpoint.ranges[r], endpoint.sourceColumn, type);

        if (result === null && partialResult !== null) {
          result = partialResult;
        }

        if (partialResult !== null) {
          switch (type) {
            case 'min':
              result = Math.min(result, partialResult);
              break;
            case 'max':
              result = Math.max(result, partialResult);
              break;
          }

        }
      }
    }

    return result === null ? 'Not enough data' : result;
  }

  /**
   * Get a local minimum of the provided sub-range
   *
   * @param {Array} rowRange Range for the calculation.
   * @param {Number} col Column index.
   * @param {String} type `'min'` or `'max'`
   * @returns {Number} Min or max value.
   */
  getPartialMinMax(rowRange, col, type) {
    let result = null;
    let i = rowRange[1] || rowRange[0];
    let cellValue;

    do {
      cellValue = this.getCellValue(i, col) || null;

      if (result === null) {
        result = cellValue;
      } else if (cellValue !== null) {
        switch (type) {
          case 'min':
            result = Math.min(result, cellValue);
            break;
          case 'max':
            result = Math.max(result, cellValue);
            break;
        }

      }

      i--;
    } while (i >= rowRange[0]);

    return result;
  }

  /**
   * Count empty cells in the provided row range.
   *
   * @param {Array} rowRange Row range for the calculation.
   * @param {Number} col Column index.
   * @returns {Number} Empty cells count.
   */
  countEmpty(rowRange, col) {
    let cellValue;
    let counter = 0;
    let i = rowRange[1] || rowRange[0];

    do {
      cellValue = this.getCellValue(i, col);

      if (!cellValue) {
        counter++;
      }

      i--;
    } while (i >= rowRange[0]);

    return counter;
  }

  /**
   * Count non-empty cells in the provided row range.
   *
   * @param {Object} endpoint Contains the endpoint information.
   * @returns {Number} Entry count.
   */
  countEntries(endpoint) {
    let result = 0;
    let ranges = endpoint.ranges;

    for (let r in ranges) {
      if (ranges.hasOwnProperty(r)) {
        let partial = ranges[r][1] === void 0 ? 1 : ranges[r][1] - ranges[r][0] + 1;
        let emptyCount = this.countEmpty(ranges[r], endpoint.sourceColumn);

        result += partial;
        result -= emptyCount;
      }
    }

    return result;
  }

  /**
   * Calculate the average value from the cells in the range.
   *
   * @param {Object} endpoint Contains the endpoint information.
   * @returns {Number} Avarage value.
   */
  calculateAverage(endpoint) {
    let sum = this.calculateSum(endpoint);
    let entriesCount = this.countEntries(endpoint);

    return sum / entriesCount;
  }

  /**
   * Gets a cell value, taking into consideration a basic validation.
   *
   * @param {Number} row Row index.
   * @param {Number} col Column index.
   * @returns {String} The cell value.
   */
  getCellValue(row, col) {
    let cellValue = this.hot.getDataAtCell(row, col);
    let cellClassName = this.hot.getCellMeta(row, col).className || '';

    if (cellClassName.indexOf('columnSummaryResult') > -1) {
      return null;
    }

    if (this.currentEndpoint.forceNumeric) {
      if (typeof cellValue === 'string') {
        cellValue = cellValue.replace(/,/, '.');
      }

      cellValue = parseFloat(cellValue, 10);
    }

    if (isNaN(cellValue)) {
      if (!this.currentEndpoint.suppressDataTypeErrors) {
        throw new Error('ColumnSummary plugin: cell at (${row}, ${col}) is not in a numeric format. Cannot do the calculation.');
      }
    }

    return cellValue;
  }

}

export {ColumnSummary};

registerPlugin('columnSummary', ColumnSummary);
