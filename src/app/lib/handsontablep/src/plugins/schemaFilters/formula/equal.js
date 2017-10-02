import {stringify} from 'handsontable/helpers/mixed';
import {registerFormula} from './../formulaRegisterer';

export const FORMULA_NAME = 'eq';

function formula(dataRow, [value, value2, value3] = inputValues) {
  if (value3) {
    value = value3;
  }
  return stringify(dataRow.value).toLowerCase() === stringify(value);
}

registerFormula(FORMULA_NAME, formula, {
  name: 'Sama dengan',
  inputsCount: 1
});
