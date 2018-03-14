let nomorSuratFormatter = {};

let days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
let months = ['Januari', 'Februari', 'Maret', 'April', 'May', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'Nopember', 'Desember']

nomorSuratFormatter["<Tanggal D>"] = (counter) => {
    let date = new Date();
    let day = date.getDay();

    return days[day];
}

nomorSuratFormatter["<Tanggal DD>"] = (counter) => {
    let date = new Date();
    let day = date.getDay();

    return day > 10 ? day.toString() : '0' + day.toString();
}

nomorSuratFormatter["<Bulan M>"] = (counter) => {
    let date = new Date();
    let month = date.getMonth();

    return months[month];
}

nomorSuratFormatter["<Bulan MM>"] = (counter) => {
    let date = new Date();
    let month = date.getMonth();

    return month + 1 > 10 ? (month + 1).toString() : '0' + (month + 1).toString();
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
    return counter > 10 ? counter : '0' + counter.toString();
}

export default nomorSuratFormatter;