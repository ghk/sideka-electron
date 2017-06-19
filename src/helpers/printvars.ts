/// <reference path="../../app/typings/index.d.ts" />

import settings from '../stores/settings';

const moment = require('moment');
moment.locale("id");

var createPrintVars = (desa) => {
    return Object.assign({
        tahun: new Date().getFullYear(),
        tanggal: moment().format("LL"),
        jabatan: settings.data["jabatan"],
        nama: settings.data["penyurat"],
    }, desa);
};

export default createPrintVars;
