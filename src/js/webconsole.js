(function($) {
    $(document).ready(function() {
        var settings = {'url': 'webconsole.php',
                        'prompt_path_length': 32,
                        'domain': document.domain || window.location.host,
                        'is_small_window': $(document).width() < 625 ? true : false};
        var environment = {'user': '', 'hostname': '', 'path': ''};
        var no_login = typeof(__NO_LOGIN__) !== 'undefined' ? __NO_LOGIN__ : false;
        var silent_mode = false;

        // Default banner
        var banner_main = "Web Console";
        var banner_link = 'http://web-console.org';
        var banner_extra = banner_link + '\n';

        // Big banner
        if (!settings.is_small_window) {
            banner_main = "" +
                          "  _    _      _     _____                       _                " +
                          "\n | |  | |    | |   /  __ \\                     | |            " +
                          "\n | |  | | ___| |__ | /  \\/ ___  _ __  ___  ___ | | ___        " +
                          "\n | |/\\| |/ _ \\ '_ \\| |    / _ \\| '_ \\/ __|/ _ \\| |/ _ \\ " +
                          "\n \\  /\\  /  __/ |_) | \\__/\\ (_) | | | \\__ \\ (_) | |  __/  " +
                          "\n  \\/  \\/ \\___|____/ \\____/\\___/|_| |_|___/\\___/|_|\\___| " +
                          "";
            banner_extra = '\n                 ' + banner_link + '\n';
        }

        // Output
        function show_output(output) {
            if (output) {
                if (typeof output === 'string') terminal.echo(output);
                else if (output instanceof Array) terminal.echo($.map(output, function(object) {
                                                      return $.json_stringify(object);
                                                  }).join(' '));
                else if (typeof output === 'object') terminal.echo($.json_stringify(output));
                else terminal.echo(output);
            }
        }

        // Prompt
        function make_prompt() {
            var path = environment.path;
            if (path && path.length > settings.prompt_path_length)
                path = '...' + path.slice(path.length - settings.prompt_path_length + 3);

            return '[[b;#d33682;]' + (environment.user || 'user') + ']' +
                   '@[[b;#6c71c4;]' + (environment.hostname || settings.domain || 'web-console') + '] ' +
                   (path || '~') +
                   '$ ';
        }

        function update_prompt(terminal) {
            terminal.set_prompt(make_prompt());
        }

        // Environment
        function update_environment(terminal, data) {
            if (data) {
                $.extend(environment, data);
                update_prompt(terminal);
            }
        }

        // Service
        function service(terminal, method, parameters, success, error, options) {
            options = $.extend({'pause': true}, options);
            if (options.pause) terminal.pause();

            $.jrpc(settings.url, method, parameters,
                function(json) {
                    if (options.pause) terminal.resume();

                    if (!json.error) {
                        if (success) success(json.result);
                    }
                    else if (error) error();
                    else {
                        var message = $.trim(json.error.message || '');
                        var data =  $.trim(json.error.data || '');

                        if (!message && data) {
                            message = data;
                            data = '';
                        }

                        terminal.error('&#91;ERROR&#93;' +
                                       ' RPC: ' + (message || 'Unknown error') +
                                       (data ? (" (" + data + ")") : ''));
                    }
                },
                function(xhr, status, error_data) {
                    if (options.pause) terminal.resume();

                    if (error) error();
                    else {
                        if (status !== 'abort') {
                            var response = $.trim(xhr.responseText || '');

                            terminal.error('&#91;ERROR&#93;' +
                                           ' AJAX: ' + (status || 'Unknown error') +
                                           (response ? ("\nServer reponse:\n" + response) : ''));
                        }
                    }
                });
        }

        function service_authenticated(terminal, method, parameters, success, error, options) {
            var token = terminal.token();
            if (token) {
                var service_parameters = [token, environment];
                if (parameters && parameters.length)
                    service_parameters.push.apply(service_parameters, parameters);
                service(terminal, method, service_parameters, success, error, options);
            }
            else {
                // Should never happen
                terminal.error('&#91;ERROR&#93; Access denied (no authentication token found)');
            }
        }

        // Interpreter
        function interpreter(command, terminal) {
            command = $.trim(command || '');
            if (!command) return;

            var command_parsed = $.terminal.splitCommand(command),
                method = null, parameters = [];

            if (command_parsed.name.toLowerCase() === 'cd') {
                method = 'cd';
                parameters = [command_parsed.args.length ? command_parsed.args[0] : ''];
            }
            else {
                method = 'run';
                parameters = [command];
            }

            if (method) {
                service_authenticated(terminal, method, parameters, function(result) {
                    update_environment(terminal, result.environment);
                    show_output(result.output);
                });
            }
        }

        // Login
        function login(user, password, callback) {
            user = $.trim(user || '');
            password = $.trim(password || '');

            if (user && password) {
                service(terminal, 'login', [user, password], function(result) {
                    if (result && result.token) {
                        environment.user = user;
                        update_environment(terminal, result.environment);
                        show_output(result.output);
                        callback(result.token);
                    }
                    else callback(null);
                },
                function() { callback(null); });
            }
            else callback(null);
        }

        // Completion
        function completion(terminal, pattern, callback) {
            var view = terminal.export_view();
            var command = view.command.substring(0, view.position);

            service_authenticated(terminal, 'completion', [pattern, command], function(result) {
                show_output(result.output);

                if (result.completion && result.completion.length) {
                    result.completion.reverse();
                    callback(result.completion);
                }
            }, null, {pause: false});
        }

        // Logout
        function logout() {
            silent_mode = true;

            try {
                terminal.clear();
                terminal.logout();
            }
            catch (error) {}

            silent_mode = false;
        }

        // Terminal
        var terminal = $('body').terminal(interpreter, {
            login: !no_login ? login : false,
            prompt: make_prompt(),
            greetings: !no_login ? "You are authenticated" : "",
            tabcompletion: true,
            completion: completion,
            onBlur: function() { return false; },
            exceptionHandler: function(exception) {
                if (!silent_mode) terminal.exception(exception);
            }
        });

        // Logout
        if (no_login) terminal.set_token('NO_LOGIN');
        else {
            logout();
            $(window).unload(function() { logout(); });
        }

        // Banner
        if (banner_main) terminal.echo(banner_main);
        if (banner_extra) terminal.echo(banner_extra);
    });
})(jQuery);
