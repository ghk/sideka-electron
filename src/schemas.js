import pendudukSchema from './schemas/penduduk';
import keluargaSchema from './schemas/keluarga';
import apbdesSchema from './schemas/apbdes';
import indikatorSchema from './schemas/indikator';
class Schemas {
    constructor() {
        this.penduduk = pendudukSchema;
        this.keluarga = keluargaSchema;
        this.apbdes = apbdesSchema;
        this.indikator = indikatorSchema;
    }
    getHeader(schema) {
        return schema.map(c => c.header);
    }
    objToArray(obj, schema) {
        let result = [];
        for (var i = 0; i < schema.length; i++)
            result.push(obj[schema[i].field]);
        return result;
    }
    arrayToObj(arr, schema) {
        let result = {};
        for (var i = 0; i < schema.length; i++)
            result[schema[i].field] = arr[i];
        return result;
    }
    getColWidths(schema) {
        var result = [];
        for (var i = 0; i < schema.length; i++) {
            var width = schema[i].width;
            if (!width)
                width = 150;
            result.push(width);
        }
        return result;
    }
    registerCulture(window) {
        var a = {
            langLocaleCode: "id-ID", cultureCode: "id-ID", delimiters: {
                thousands: ".", decimal: ","
            }, abbreviations: {
                thousand: "k", million: "m", billion: "b", trillion: "t"
            }, ordinal: function (a) {
                var b = a % 10;
                return 1 === ~~(a % 100 / 10) ? "th" : 1 === b ? "st" : 2 === b ? "nd" : 3 === b ? "rd" : "th";
            }, currency: {
                symbol: "Rp. ", position: "prefix"
            }, defaults: {
                currencyFormat: ",4 a"
            }, formats: {
                fourDigits: "4 a", fullWithTwoDecimals: "$ ,0.00", fullWithTwoDecimalsNoCurrency: ",0.00", fullWithNoDecimals: "$ ,0"
            }
        };
        window.numbro.culture(a.cultureCode, a);
    }
}
export default new Schemas();
