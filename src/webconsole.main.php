<?php
// Initializing
if (!isset($NO_LOGIN)) $NO_LOGIN = false;
if (!isset($ACCOUNTS)) $ACCOUNTS = array();
if (isset($USER) && isset($PASSWORD) && $USER && $PASSWORD) $ACCOUNTS[$USER] = $PASSWORD;
if (!isset($PASSWORD_HASH_ALGORITHM)) $PASSWORD_HASH_ALGORITHM = '';
if (!isset($HOME_DIRECTORY)) $HOME_DIRECTORY = '';
$IS_CONFIGURED = ($NO_LOGIN || count($ACCOUNTS) >= 1) ? true : false;

// Utilities
function is_empty_string($string) {
    return strlen($string) <= 0;
}

function is_equal_strings($string1, $string2) {
    return strcmp($string1, $string2) == 0;
}

function get_hash($algorithm, $string) {
    return hash($algorithm, trim((string) $string));
}

// Command execution
function execute_command($command) {
    $descriptors = array(
        0 => array('pipe', 'r'), // STDIN
        1 => array('pipe', 'w'), // STDOUT
        2 => array('pipe', 'w')  // STDERR
    );

    $process = proc_open($command . ' 2>&1', $descriptors, $pipes);
    if (!is_resource($process)) die("Can't execute command.");

    // Nothing to push to STDIN
    fclose($pipes[0]);

    $output = stream_get_contents($pipes[1]);
    fclose($pipes[1]);

    $error = stream_get_contents($pipes[2]);
    fclose($pipes[2]);

    // All pipes must be closed before "proc_close"
    $code = proc_close($process);

    return $output;
}

// Command parsing
function parse_command($command) {
    $value = ltrim((string) $command);

    if (!is_empty_string($value)) {
        $values = explode(' ', $value);
        $values_total = count($values);

        if ($values_total > 1) {
            $value = $values[$values_total - 1];

            for ($index = $values_total - 2; $index >= 0; $index--) {
                $value_item = $values[$index];

                if (substr($value_item, -1) == '\\') $value = $value_item . ' ' . $value;
                else break;
            }
        }
    }

    return $value;
}

// RPC Server
class WebConsoleRPCServer extends BaseJsonRpcServer {
    protected $home_directory = '';

    private function error($message) {
        throw new Exception($message);
    }

    // Authentication
    private function authenticate_user($user, $password) {
        $user = trim((string) $user);
        $password = trim((string) $password);

        if ($user && $password) {
            global $ACCOUNTS, $PASSWORD_HASH_ALGORITHM;

            if (isset($ACCOUNTS[$user]) && !is_empty_string($ACCOUNTS[$user])) {
                if ($PASSWORD_HASH_ALGORITHM) $password = get_hash($PASSWORD_HASH_ALGORITHM, $password);

                if (is_equal_strings($password, $ACCOUNTS[$user]))
                    return $user . ':' . get_hash('sha256', $password);
            }
        }

        throw new Exception("Incorrect user or password");
    }

    private function authenticate_token($token) {
        global $NO_LOGIN;
        if ($NO_LOGIN) return true;

        $token = trim((string) $token);
        $token_parts = explode(':', $token, 2);

        if (count($token_parts) == 2) {
            $user = trim((string) $token_parts[0]);
            $password_hash = trim((string) $token_parts[1]);

            if ($user && $password_hash) {
                global $ACCOUNTS;

                if (isset($ACCOUNTS[$user]) && !is_empty_string($ACCOUNTS[$user])) {
                    $real_password_hash = get_hash('sha256', $ACCOUNTS[$user]);
                    if (is_equal_strings($password_hash, $real_password_hash)) return $user;
                }
            }
        }

        throw new Exception("Incorrect user or password");
    }

    private function get_home_directory($user) {
        global $HOME_DIRECTORY;

        if (is_string($HOME_DIRECTORY)) {
            if (!is_empty_string($HOME_DIRECTORY)) return $HOME_DIRECTORY;
        }
        else if (is_string($user) && !is_empty_string($user) && isset($HOME_DIRECTORY[$user]) && !is_empty_string($HOME_DIRECTORY[$user]))
            return $HOME_DIRECTORY[$user];

        return getcwd();
    }

    // Environment
    private function get_environment() {
        $hostname = function_exists('gethostname') ? gethostname() : null;
        return array('path' => getcwd(), 'hostname' => $hostname);
    }

    private function set_environment($environment) {
        $environment = !empty($environment) ? (array) $environment : array();
        $path = (isset($environment['path']) && !is_empty_string($environment['path'])) ? $environment['path'] : $this->home_directory;

        if (!is_empty_string($path)) {
            if (is_dir($path)) {
                if (!@chdir($path)) return array('output' => "Unable to change directory to current working directory, updating current directory",
                                                 'environment' => $this->get_environment());
            }
            else return array('output' => "Current working directory not found, updating current directory",
                              'environment' => $this->get_environment());
        }
    }

    // Initialization
    private function initialize($token, $environment) {
        $user = $this->authenticate_token($token);
        $this->home_directory = $this->get_home_directory($user);
        $result = $this->set_environment($environment);

        if ($result) return $result;
    }

    // Methods
    public function login($user, $password) {
        $result = array('token' => $this->authenticate_user($user, $password),
                        'environment' => $this->get_environment());

        $home_directory = $this->get_home_directory($user);
        if (!is_empty_string($home_directory)) {
            if (is_dir($home_directory)) $result['environment']['path'] = $home_directory;
            else $result['output'] = "Home directory not found: ". $home_directory;
        }

        return $result;
    }

    public function cd($token, $environment, $path) {
        $result = $this->initialize($token, $environment);
        if ($result) return $result;

        $path = trim((string) $path);
        if (is_empty_string($path)) $path = $this->home_directory;

        if (!is_empty_string($path)) {
            if (is_dir($path)) {
                if (!@chdir($path)) return array('output' => "cd: ". $path . ": Unable to change directory");
            }
            else return array('output' => "cd: ". $path . ": No such directory");
        }

        return array('environment' => $this->get_environment());
    }

    public function completion($token, $environment, $pattern, $command) {
        $result = $this->initialize($token, $environment);
        if ($result) return $result;

        $scan_path = '';
        $completion_prefix = '';
        $completion = array();

        if (!empty($pattern)) {
            if (!is_dir($pattern)) {
                $pattern = dirname($pattern);
                if ($pattern == '.') $pattern = '';
            }

            if (!empty($pattern)) {
                if (is_dir($pattern)) {
                    $scan_path = $completion_prefix = $pattern;
                    if (substr($completion_prefix, -1) != '/') $completion_prefix .= '/';
                }
            }
            else $scan_path = getcwd();
        }
        else $scan_path = getcwd();

        if (!empty($scan_path)) {
            // Loading directory listing
            $completion = array_values(array_diff(scandir($scan_path), array('..', '.')));
            natsort($completion);

            // Prefix
            if (!empty($completion_prefix) && !empty($completion)) {
                foreach ($completion as &$value) $value = $completion_prefix . $value;
            }

            // Pattern
            if (!empty($pattern) && !empty($completion)) {
                // For PHP version that does not support anonymous functions (available since PHP 5.3.0)
                function filter_pattern($value) {
                    global $pattern;
                    return !strncmp($pattern, $value, strlen($pattern));
                }

                $completion = array_values(array_filter($completion, 'filter_pattern'));
            }
        }

        return array('completion' => $completion);
    }

    public function run($token, $environment, $command) {
        $result = $this->initialize($token, $environment);
        if ($result) return $result;

        $output = ($command && !is_empty_string($command)) ? execute_command($command) : '';
        if ($output && substr($output, -1) == "\n") $output = substr($output, 0, -1);

        return array('output' => $output);
    }
}

// Processing request
if (array_key_exists('REQUEST_METHOD', $_SERVER) && $_SERVER['REQUEST_METHOD'] == 'POST') {
    $rpc_server = new WebConsoleRPCServer();
    $rpc_server->Execute();
}
else if (!$IS_CONFIGURED) {
?>
<!DOCTYPE html>
<html>
    <head>
        <!-- @include head.html -->
        <style type="text/css"><!-- @include all.min.css --></style>
    </head>
    <body>
        <div class="configure">
            <p>Web Console must be configured before use:</p>
            <ul>
                <li>Open Web Console PHP file in your favorite text editor.</li>
                <li>At the beginning of the file enter your <span class="variable">$USER</span> and <span class="variable">$PASSWORD</span> credentials, edit any other settings that you like (see description in the comments).</li>
                <li>Upload changed file to the web server and open it in the browser.</li>
            </ul>
            <p>For more information visit Web Console website: <a href="http://web-console.org">http://web-console.org</a></p>
        </div>
    </body>
</html>
<?php
}
else { ?>
<!DOCTYPE html>
<html class="no-js">
    <head>
        <!-- @include head.html -->
        <style type="text/css"><!-- @include all.min.css --></style>
        <script type="text/javascript"><!-- @include all.min.js --></script>
    </head>
    <body></body>
</html>
<?php } ?>
