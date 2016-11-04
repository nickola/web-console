module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            php: {
                options: {
                    process: function(source, path) {
                        source = source.replace(/'dev';/g, "'';");
                        return source.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
                    }
                },
                src: [
                    'src/webconsole.settings.php',
                    'src/vendor/eazy-jsonrpc/src/BaseJsonRpcServer.php',
                    'src/close.tag.php',
                    'src/webconsole.main.php'
                ],
                dest : 'release/parts/webconsole.html'
            },
            css: {
                src: [
                    'src/vendor/normalize/normalize.css',
                    'src/vendor/jquery.terminal/css/jquery.terminal-0.11.12.min.css',
                    'src/css/webconsole.css'
                ],
                dest: 'release/parts/all.css'
            },
            js: {
                options: {
                    process: function(source, path) {
                        return source.replace('webconsole.php', '');
                    }
                },
                src: [
                    'src/vendor/jquery.terminal/js/jquery-1.7.1.min.js',
                    'src/vendor/jquery.terminal/js/jquery.mousewheel-min.js',
                    'src/vendor/jquery.terminal/js/jquery.terminal-0.11.12.min.js',
                    'src/js/webconsole.js'
                ],
                dest: 'release/parts/all.js'
            },
            html: {
                options: {
                    process: function(source, path) {
                        return source.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
                    }
                },
                src: 'src/html/head.html',
                dest : 'release/parts/head.html'
            },
            text: {
                options: {
                    process: function(source, path) {
                        // Images
                        source = source.replace(/!.*\n\s*/g, '');

                        // Quotes
                        source = source.replace(/`(\$[^`]+)`/g, '$1');
                        source = source.replace(/`/g, '"');

                        // Download link
                        source = source.replace(/\[(Download)\]\([^\)]+\)\s*/g, '$1 ');

                        // Other links
                        source = source.replace(/\[([^\]]+)\]\s*/g, '$1 ');

                        // Lists
                        // source = source.replace(/\s+- /g, '\n  - ');

                        // Trailing spaces
                        return source.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
                    }
                },
                src: 'README.md',
                dest : 'release/parts/README.txt'
            },
        },
        cssmin: {
            css: {
                options: {'keepSpecialComments': 0},
                src: '<%= concat.css.dest %>',
                dest: 'release/parts/all.min.css'
            }
        },
        uglify: {
            js: {
                options: {'preserveComments': false},
                src: '<%= concat.js.dest %>',
                dest: 'release/parts/all.min.js'
            }
        },
        preprocess: {
            php: {
                options: {
                    context : {
                        DATE: grunt.template.today('yyyy-mm-dd'),
                        YEAR: grunt.template.today('yyyy'),
                        VERSION: '<%= pkg.version %>'
                    }
                },
                src: 'release/parts/webconsole.html',
                dest: 'release/parts/webconsole.php'
            }
        },
        replace: {
            php: {
                options: {
                  patterns: [
                    {
                      match: /__NO_LOGIN__/g,
                      replacement: '<?php echo $NO_LOGIN ? "true" : "false" ?>'
                    }
                  ]
                },
                src: 'release/parts/webconsole.php',
                dest: 'release/webconsole.php'
            }
        },
        compress: {
            all: {
                options: {
                    archive: 'release/webconsole-<%= pkg.version %>.zip'
                },
                files: [
                    {expand: true, cwd: 'release/', src: 'webconsole.php', dest: 'webconsole/'},
                    {expand: true, cwd: 'release/parts/', src: 'README.txt', dest: 'webconsole/'},
                    {expand: true, cwd: 'src/', src: 'useful/*', dest: 'webconsole/'},
                    {expand: true, cwd: 'src/', src: 'useful/.*', dest: 'webconsole/'}
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-preprocess');
    grunt.loadNpmTasks('grunt-replace');

    grunt.registerTask('default', ['concat', 'cssmin', 'uglify', 'preprocess', 'replace', 'compress']);
};
