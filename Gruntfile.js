'use strict';
module.exports = function(grunt) {

    // Initialize configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            files: [
                'js/**/*.js',
            ],
            options: {
                expr: true,
                globals: {
                    jQuery: true,
                    console: true,
                    module: true,
                    document: true,
                },
            },
        },

        jscs: {
            src: [
                'js/**/*.js'
            ],
            options: {}
        },

        copy: {
            main: {
                files: [{
                    expand: true,
                    nonull: true,
                    src: [
                        'readme.txt',
                        'CHANGELOG.md',
                        '*.php',
                        'includes/**',
                        'admin/**',
                        '!**/scss/**',
                        'js/**',
                    ],
                    dest: 'build/'
                }],
            },
        },

        clean: {
            build: ["build/*"],
        },

        wp_deploy: {
            options: {
                svn_url: "https://plugins.svn.wordpress.org/{plugin-slug}/",
                plugin_slug: 'wp-content-security-policy',
                // svn_user: 'your-wp-repo-username',
                build_dir: 'build', //relative path to your build directory
                assets_dir: 'wp-assets', //relative path to your assets directory (optional).
                max_buffer: 1024 * 1024
            },
            release: {
                // nothing
            },
            trunk: {
                options: {
                    deploy_trunk: true,
                    deploy_tag: false,
                }
            },
            assets: {
                options: {
                    deploy_trunk: false,
                    deploy_tag: false,
                }
            }
        },

        delegate: {
            sass: {
                src: ['<%= sass.dev.files.src %>**/*.scss'],
                dest: '<%= sass.dev.files.dest %>'
            }
        },

        sass: {
            dist: {
                options: {
                    outputStyle: 'compressed',
                    sourceComments: false,
                    sourcemap: 'none'
                },
                files: [{
                        expand: true,
                        cwd: 'admin/scss',
                        src: ['*.scss'],
                        dest: 'build/admin/css',
                        ext: '.min.css'
                    },
                    {
                        expand: true,
                        cwd: 'public/scss',
                        src: ['*.scss'],
                        dest: 'build/public/css',
                        ext: '.min.css'
                    }
                ]
            },
            dev: {
                options: {
                    outputStyle: 'expanded',
                    sourceComments: false,
                    sourceMapEmbed: true,
                },
                files: [{
                        expand: true,
                        cwd: 'admin/scss',
                        src: ['*.scss'],
                        dest: 'admin/css',
                        ext: '.css'
                    },
                    {
                        expand: true,
                        cwd: 'public/scss',
                        src: ['*.scss'],
                        dest: 'public/css',
                        ext: '.css'
                    }
                ]
            }
        },

        postcss: {
            options: {
                map: true, // inline sourcemaps.
                processors: [
                    require('autoprefixer')({
                        browsers: ['>1%', 'last 2 versions', 'IE 9', 'IE 10']
                    }) // add vendor prefixes
                ]
            },
            dev: {
                files: [{
                    expand: true,
                    cwd: 'admin/css',
                    src: ['**/*.css', '!default-styles.css'],
                    dest: 'admin/css',
                    ext: '.css'
                }]
            },
            dev_default_styles: {
                files: [{
                    expand: true,
                    cwd: 'admin/css',
                    src: ['default-styles.css'],
                    dest: 'admin/css',
                    ext: '.css'
                }],
                options: {
                    map: false,
                }
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: 'build/admin/css',
                    src: ['**/*.css'],
                    dest: 'build/admin/css',
                    ext: '.css'
                }]
            }
        },

        // uglify targets are dynamically generated by the minify task
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= ugtargets[grunt.task.current.target].filename %> <%= grunt.template.today("yyyy-mm-dd h:MM:ss TT") %> */\n',
                report: 'min',
            },
        },

        minify: {
            dist: {
                files: grunt.file.expandMapping(['js/**/*.js', '!js/**/*min.js'], '', {
                    rename: function(destBase, destPath) {
                        return destBase + destPath.replace('.js', '.min.js');
                    }
                })
            },
        },
    });

    // load all standard tasks
    require('load-grunt-tasks')(grunt, {
        scope: 'devDependencies'
    });


    // delegate stuff
    grunt.registerTask('delegate', function() {
        grunt.task.run(this.args.join(':'));
    });

    // dynamically generate uglify targets
    grunt.registerMultiTask('minify', function() {
        this.files.forEach(function(file) {
            var path = file.src[0],
                target = path.match(/([^.]*)\.js/)[1];

            // store some information about this file in config
            grunt.config('ugtargets.' + target, {
                path: path,
                filename: path.split('/').pop()
            });

            // create and run an uglify target for this file
            grunt.config('uglify.' + target + '.files', [{
                src: [path],
                dest: path.replace(/^(.*)\.js$/, '$1.min.js')
            }]);
            grunt.task.run('uglify:' + target);
        });
    });

    grunt.registerTask('phpcs', [
        'composer:dev:phpcs',
    ]);

    grunt.registerTask('build', [
        'clean:build',
        'copy:main',
        'newer:delegate:sass:dist',
        'newer:postcss:dist',
        'newer:minify'
    ]);

    grunt.registerTask('deploy', [
        'phpcs',
        'jscs',
        'build',
        'wp_deploy:release'
    ]);
    grunt.registerTask('trunk', [
        'phpcs',
        'build',
        'wp_deploy:trunk'
    ]);
    grunt.registerTask('assets', [
        'clean:build',
        'copy:main',
        'copy:meta',
        'wp_deploy:assets'
    ]);

    grunt.registerTask('default', [
        'phpcs',
        'jscs',
        'newer:delegate:sass:dev',
        'newer:postcss:dev',
        'newer:minify'
    ]);
};
