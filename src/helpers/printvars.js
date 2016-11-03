import moment from 'moment';

moment.locale("id");

var createPrintVars = function(desa) {
    return Object.assign({
        tahun: 2016,
        tanggal: moment().format("LL"),
        jabatan: "Sekdes",
        nama: "",
    }, desa);
};

export default createPrintVars;