import pendudukSchema from './schemas/penduduk';
import keluargaSchema from './schemas/keluarga';
import apbdesSchema from './schemas/apbdes';
import indikatorSchema from './schemas/indikator';
import renstraSchema from './schemas/renstra';
import rpjmdesSchema from './schemas/rpjmdes';

class Schemas {
    penduduk: any;
    keluarga: any;
    apbdes: any;
    indikator: any;
    renstra:any;
    rpjmdes:any;

    constructor(){
        this.penduduk = pendudukSchema;
        this.keluarga = keluargaSchema;
        this.apbdes = apbdesSchema;
        this.indikator = indikatorSchema;
        this.rpjmdes = rpjmdesSchema;
        this.renstra = renstraSchema;
    }

    getHeader(schema): any{
        return schema.filter(c => !c.hidden).map(c => c.header);
    }

    objToArray(obj, schema): any{
        let result = [];

        for(var i = 0; i < schema.length; i++)
            result.push(obj[schema[i].field]);
        
        return result;
    }

    arrayToObj(arr, schema): any{
        let result = {};

        for(var i = 0; i < schema.length; i++)
            result[schema[i].field] = arr[i];
        
        return result;
    }

     getColumns(schema): any{
        var result = [];
        for(var i = 0; i < schema.length; i++){
            var column = Object.assign({}, schema[i]);
            if(column.hidden)
                continue;
            column["data"] = i;
            result.push(column);
        }
        return result;
    }

     getColWidths(schema): any{
        var result = [];
        for(var i = 0; i < schema.length; i++){
            if(schema[i].hidden)
                continue;

            var width = schema[i].width;

            if(!width)
                width = 150;

            result.push(width);
        }
        return result;
    }

    registerCulture(window): void{
        var a= {
            langLocaleCode:"id-ID", cultureCode:"id-ID", delimiters: {
                thousands: ".", decimal: ","
            }, abbreviations: {
                thousand: "k", million: "m", billion: "b", trillion: "t"
            }, ordinal:function(a) {
                var b=a%10;
                return 1===~~(a%100/10)?"th": 1===b?"st": 2===b?"nd": 3===b?"rd": "th"
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
