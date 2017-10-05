import pendudukSchema from './schemas/penduduk';
import keluargaSchema from './schemas/keluarga';
import logSuratSchema from './schemas/logSurat';
import mutasiSchema from './schemas/mutasi';
import renstraSchema from './schemas/renstra';
import rpjmSchema from './schemas/rpjm';
import rkpSchema from './schemas/rkp';
import rabSchema from './schemas/rab';
import oldSppSchema from './schemas/old_spp';
import pbdtRtSchema from './schemas/pbdtRt';
import pbdtIdvSchema from './schemas/pbdtIdv';
import penerimaanSchema from './schemas/penerimaan';
import penyetoranSchema from './schemas/penyetoran';
import swadayaSchema from './schemas/swadaya';
import kegiatanSchema from './schemas/kegiatan';
import logPembangunanSchema from './schemas/logPembangunan';
import sppSchema from './schemas/spp';
import sppRinciSchema from './schemas/sppRinci';
import sppBuktiSchema from './schemas/sppBukti';
import tbpSchema from './schemas/tbp';
import tbpRinciSchema from './schemas/tbpRinci';
import prodeskelSchema from './schemas/prodeskel';

class Schemas {
    penduduk = pendudukSchema;
    keluarga = keluargaSchema;
    logSurat = logSuratSchema;
    mutasi = mutasiSchema;
    renstra = renstraSchema;
    rpjm = rpjmSchema;
    rkp = rkpSchema;
    rab = rabSchema;
    oldSpp = oldSppSchema;
    pbdtRt = pbdtRtSchema;
    pbdtIdv  = pbdtIdvSchema;
    penerimaan = penerimaanSchema;
    penyetoran = penyetoranSchema;
    swadaya = swadayaSchema;
    kegiatan = kegiatanSchema;
    logPembangunan = logPembangunanSchema;
    spp = sppSchema;
    spp_rinci = sppRinciSchema;
    spp_bukti = sppBuktiSchema;
    tbp = tbpSchema;
    tbp_rinci = tbpRinciSchema;
    prodeskel = prodeskelSchema;

    constructor() {
    }

    getHeader(schema): any {
        return schema.filter(c => !c.hidden).map(c => c.header);
    }

    objToArray(obj, schema): any {
        let result = [];

        for (var i = 0; i < schema.length; i++)
            result.push(obj[schema[i].field]);

        return result;
    }

    arrayToObj(arr, schema): any {
        let result = {};

        for (var i = 0; i < schema.length; i++)
            result[schema[i].field] = arr[i];

        return result;
    }

    getColumns(schema): any {
        var result = [];
        for (var i = 0; i < schema.length; i++) {
            var column = Object.assign({}, schema[i]);
            if (column.hidden)
                continue;
            column["data"] = i;
            result.push(column);
        }
        return result;
    }

    getColWidths(schema): any {
        var result = [];
        for (var i = 0; i < schema.length; i++) {
            if (schema[i].hidden)
                continue;

            var width = schema[i].width;

            if (!width)
                width = 150;

            result.push(width);
        }
        return result;
    }

    registerCulture(window): void {
        var a = {
            langLocaleCode: "id-ID", cultureCode: "id-ID", delimiters: {
                thousands: ".", decimal: ","
            }, abbreviations: {
                thousand: "k", million: "m", billion: "b", trillion: "t"
            }, ordinal: function (a) {
                var b = a % 10;
                return 1 === ~~(a % 100 / 10) ? "th" : 1 === b ? "st" : 2 === b ? "nd" : 3 === b ? "rd" : "th"
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
