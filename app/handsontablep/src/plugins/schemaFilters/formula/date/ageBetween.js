import {registerFormula} from './../../formulaRegisterer';
import moment from 'moment';

export const FORMULA_NAME = 'age_between';

function formula(dataRow, [from, to] = inputValues) {
  let date = moment(dataRow.value, dataRow.meta.dateFormat);
  let fromDate = moment().subtract(from, 'years');
  let toDate = moment().subtract(to, 'years');

  if (!date.isValid() || !fromDate.isValid() || !toDate.isValid()) {
    return false;
  }

  return date.diff(fromDate) >= 0 && date.diff(toDate) <= 0;
}

registerFormula(FORMULA_NAME, formula, {
  name: 'Umur di antara',
  inputsCount: 2,
  inputPlaceholders: ['Dari (Tahun)', 'Sampai (Tahun)']
});
