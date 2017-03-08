/// <reference path="../../app/typings/index.d.ts" />

const moment = require('moment');
moment.locale("id");

var createPrintVars = (desa) => {
    return Object.assign({
        tahun: 2016,
        tanggal: moment().format("LL"),
        jabatan: "Sekdes",
        nama: "",
    }, desa);
};

export default createPrintVars;
