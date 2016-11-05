'use strict';

var childProcess = require('child_process');
var gulp = require('gulp');
var createHash = require("crypto").createHash;
var createReadStream = require("fs").createReadStream;
var writeFile = require("fs").writeFile;
var safeDump = require("js-yaml").safeDump;
var path = require("path");

gulp.task('makeyml', function () {
    var installerFilename = "Sideka Setup 0.0.1.exe";
    var version = "0.0.1";
    sha256(path.join("dist",installerFilename)).then(sha2 => {
        writeFile(path.join("dist", 'latest.yml'), safeDump({
            version: version,
            path: installerFilename,
            sha2: sha2,
        }))
    });
});

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256")
    hash
      .on("error", reject)
      .setEncoding("hex")

    createReadStream(file)
      .on("error", reject)
      .on("end", () => {
        hash.end()
        resolve(hash.read())
      })
      .pipe(hash, {end: false})
  })
}