import {registerFormula} from './../formulaRegisterer';

export const FORMULA_NAME = 'gte';

function formula(dataRow, [value] = inputValues) {
  if (dataRow.meta.type === 'numeric') {
    value = parseFloat(value, 10);
  }

  return dataRow.value >= value;
}

registerFormula(FORMULA_NAME, formula, {
  name: 'Lebih dari atau sama dengan',
  inputsCount: 1
});
