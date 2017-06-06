'use strict';

var gulp = require('gulp');
var less = require('gulp-less');
var watch = require('gulp-watch');
var batch = require('gulp-batch');
var plumber = require('gulp-plumber');
var jetpack = require('fs-jetpack');
var bundle = require('./bundle');
var utils = require('./utils');

var projectDir = jetpack;
var srcDir = jetpack.cwd('./src');
var destDir = jetpack.cwd('./app');

var ts = require("gulp-typescript");

var tsProject = ts.createProject('tsconfig.json');

gulp.task('ts', function(){
    return gulp.src('src/**/*.ts', { base: '.' }).pipe(tsProject()).js.pipe(gulp.dest('.'));
});

gulp.task('bundle', ['ts'], function () {
    return Promise.all([
        bundle(srcDir.path('background.js'), destDir.path('background.js')),
        bundle(srcDir.path('app.js'), destDir.path('app.js')),
        bundle(srcDir.path('sandbox.js'), destDir.path('sandbox.js')),
    ]);
});

gulp.task('less', function () {
    return Promise.all([
        gulp.src(srcDir.path('stylesheets/app.less'))
            .pipe(plumber())
            .pipe(less())
            .pipe(gulp.dest(destDir.path('stylesheets')))
    ]);
});

gulp.task('environment', function () {
    var configFile = 'config/env_' + utils.getEnvName() + '.json';
    projectDir.copy(configFile, destDir.path('env.json'), { overwrite: true });
});

gulp.task('watch', function () {    
    watch(['src/**/*.ts', 'src/*.ts'], batch(function(events, done){
        gulp.start('bundle');
    }));

    watch('src/**/*.less', batch(function (events, done) {
        gulp.start('less');
    }));
});

gulp.task('build', ['bundle', 'less', 'environment']);
