/* eslint no-console: 0, arrow-body-style: 0 */

var gulp = require('gulp');
var eslint = require('gulp-eslint');
var runSequence = require('run-sequence');

gulp.task('lint_code', [], function () {
  return gulp.src(['nodes/**/*.js'])
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
});

gulp.task('lint', ['lint_code']);
gulp.task('validate', ['lint']);

gulp.task('test', function (done) {
  runSequence('validate', done);
});
