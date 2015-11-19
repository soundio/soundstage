var package = require('./package.json')
var path = require('path');
var gulp = require('gulp');
var concat = require('gulp-concat');
var eslint = require('gulp-eslint');
var karma = require('karma').server;

gulp.task('lint', function() {
    var files   = package.sourceFiles;

    return gulp.src(files)
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

// Run the unit tests
gulp.task('test', function(done) {
    return karma
    .start({
        // unfortunately, karma needs the __dirname here
        configFile: path.join(__dirname, 'karma.conf.js'),
        browsers: ['Chrome', 'Firefox', 'Safari'],
        singleRun: true
    }, function(err) {
      // Stop the gulp task when an error occurs
      // in the unit tests
      if (err) { process.exit(1); }
      done();
    });
});

gulp.task('concat', function() {
    var files   = package.sourceFiles;
    var version = package.version;

    return gulp.src(files)
    .pipe(concat('soundstage-' + version + '.js'))
    .pipe(gulp.dest('./build/'));
});

gulp.task('default', ['test', 'lint', 'concat'], function() {});
gulp.task('watch', ['test', 'lint'], function() {});
