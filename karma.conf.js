// Karma configuration

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['qunit'],

    // list of files / patterns to load in the browser
    files: [
      'modules/collection/js/object.assign.js',
      'modules/collection/js/observe.js',
      'modules/collection/js/mixin.array.js',
      'modules/collection/js/mixin.events.js',
      'modules/collection/js/collection.js',
      'modules/audio-object/js/audio-object.js',
      'modules/clock/js/clock.js',
      'modules/midi/js/midi.js',
      'modules/midi/js/midi.utils.js',

      'js/window.audiocontext.js',
      'js/navigator.getusermedia.js',
      'js/soundio.js',
      'js/soundio.midi.js',
      'js/soundio.objects.js',
      'js/soundio.input.js',
      'js/soundio.output.js',
      'js/soundio.track.js',
      'js/soundio.send.js',
      'js/soundio.filter.js',
      'js/soundio.flange.js',
      'js/soundio.gain.js',
      'js/soundio.loop.js',
      'js/soundio.sample.js',
      'js/soundio.saturate.js',
      'js/soundio.compress.js',
      'js/soundio.envelope.js',

      'test/module.js',
      'test/test-midi.js',
      'test/test-connections.js'
    ],

    // list of files to exclude
    exclude: [
      
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    //  'js/audio-object.js': ['coverage']
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter

    // Commented for everyday use - the coverage reporter reduces scripts to one
    // line, meaning that karma gives false line numbers for errors
    reporters: ['nested'],  // 'progress', 'coverage'

    // optionally, configure the reporter
    coverageReporter: {
      type : 'lcov',
      dir : 'test-coverage/'
    },

    nestedReporter: {
      color: {
        should: 'red',
        browser: 'yellow'
      },

      icon: {
        failure: '✘ ',
        indent: '  ',
        browser: ''
      }
    },

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome', 'Firefox'],
    //browsers: ['Firefox'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
