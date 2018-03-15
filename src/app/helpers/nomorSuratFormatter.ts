let nomorSuratFormatter = {};

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'May', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 
    'Nopember', 'Desember'];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr',' Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nop', 'Des'];
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

nomorSuratFormatter["<Tanggal D>"] = (counter) => {
    let date = new Date();
    let day = date.getDay();

    return DAYS[day];
}

nomorSuratFormatter["<Tanggal DD>"] = (counter) => {
    let date = new Date();
    let day = date.getDay();

    return day > 10 ? day.toString() : '0' + day.toString();
}

nomorSuratFormatter["<Bulan M>"] = (counter) => {
    let date = new Date();
    let month = date.getMonth();

    return month + 1;
}

nomorSuratFormatter["<Bulan MM>"] = (counter) => {
    let date = new Date();
    let month = date.getMonth();

    return month + 1 > 10 ? (month + 1).toString() : '0' + (month + 1).toString();
}

nomorSuratFormatter["<Bulan romawi>"] = (counter) => {
    let date = new Date();
    let month = date.getMonth();

    return ROMAWI[month];
}

nomorSuratFormatter["<Bulan Jan>"] = (counter) => {
    let date = new Date();
    let month = date.getMonth();

    return MONTHS_SHORT[month];
}

nomorSuratFormatter["<Bulan Januari>"] = (counter) => {
    let date = new Date();
    let month = date.getMonth();

    return MONTHS[month];
}

nomorSuratFormatter["<Tahun YY>"] = (counter) => {
    let date = new Date();
    let year = date.getFullYear().toString();

    return year.substr(year.length - 2);
}

nomorSuratFormatter["<Tahun YYYY>"] = (counter) => {
    let date = new Date();
    
    return date.getFullYear().toString();
}

nomorSuratFormatter['<Counter X>'] = (counter) => {
    counter += 1;
    return counter;
}

nomorSuratFormatter['<Counter XX>'] = (counter) => {
    counter += 1;
    return counter > 10 ? counter : '0' + counter.toString();
}

nomorSuratFormatter['<Counter XXX>'] = (counter) => {
    counter += 1;

    if (counter < 10)
        return '00' + counter;
    else if (counter > 10 && counter < 100)
        return '0' + counter;
    else
        return counter;
}

nomorSuratFormatter['<Counter XXXX>'] = (counter) => {
    counter += 1;

    if (counter < 10)
        return '000' + counter;
    else if (counter > 10 && counter < 100)
        return '00' + counter;
    else if (counter > 100 && counter < 1000)
        return '0' + counter;
    else
        return counter;
}

export default nomorSuratFormatter;