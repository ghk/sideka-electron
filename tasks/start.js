'use strict';

var childProcess = require('child_process');
var electron = require('electron');
var gulp = require('gulp');

gulp.task('start', ['build', 'watch'], function () {
    var child = childProcess.spawn(electron, ['./app'], {
    });
    
    child.on('close', function () {
        // User closed the app. Kill the host process.
        process.exit();
    });
    
    child.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });
});
