import { SchemaColumn, FieldSchemaColumn } from "./schemas/schema";

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
import sipbmSchemas from './schemas/sipbm';
import nomorSuratSchema from './schemas/nomorSurat';
import * as jetpack from 'fs-jetpack';

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
    sipbm = sipbmSchemas;
    nomorSurat = nomorSuratSchema;
    
    pendudukBundle = { penduduk: pendudukSchema,
                      mutasi: mutasiSchema,
                      log_surat: logSuratSchema,
                      prodeskel: prodeskelSchema,
                      nomor_surat: nomorSuratSchema
                    };

    penerimaanBundle = { tbp: tbpSchema, tbp_rinci: tbpRinciSchema };        
    penganggaranBundle = { kegiatan: kegiatanSchema, rab: rabSchema };
    perencanaanBundle = { renstra: renstraSchema, rpjm: rpjmSchema, 
        rkp1: rkpSchema, rkp2: rkpSchema, rkp3: rkpSchema, rkp4: rkpSchema, 
        rkp5: rkpSchema, rkp6: rkpSchema };
    
    pemetaanBundle = { log_pembangunan:  logPembangunanSchema };
    sppBundle =  { spp: sppSchema, spp_rinci: sppRinciSchema, spp_bukti: sppBuktiSchema };

    constructor() {
        let mapIndicators  = jetpack.cwd(__dirname).read('bigConfig.json', 'json');
        for (let i = 0; i < mapIndicators.length; i++) {
            let indicator = mapIndicators[i];
            this.pemetaanBundle[indicator.id] = 'dict';
        }
    }

    getHeader(schema: SchemaColumn[]): string[] {
        return schema.map(c => c.header);
    }

    objToArray(obj: any, schema: FieldSchemaColumn[]): any[] {
        let result = [];

        for (var i = 0; i < schema.length; i++)
            result.push(obj[schema[i].field]);

        return result;
    }

    arrayToObj(arr: any[], schema: FieldSchemaColumn[]): any {
        let result = {};

        for (var i = 0; i < schema.length; i++)
            result[schema[i].field] = arr[i];

        return result;
    }

    getColumns(schema: SchemaColumn[]): any[] {
        var result = [];
        for (var i = 0; i < schema.length; i++) {
            var column = Object.assign({}, schema[i]);
            column["data"] = i;
            result.push(column);
        }
        return result;
    }

    getColWidths(schema: SchemaColumn[]): number[] {
        var result = [];
        for (var i = 0; i < schema.length; i++) {
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
