# About

Web Console is a web-based application that allows to execute shell commands on a server directly from a browser (web-based shell).
The application is very light, does not require any database and can be installed and configured in about 3 minutes.

If you like Web Console, please consider an opportunity to support it in [any amount of Bitcoin](https://www.blockchain.com/btc/address/1NeDa2nXJLi5A8AN2CerBSSWD363vjdWaX).

![Web Console](https://raw.github.com/nickola/web-console/master/screenshots/main.png)

# Installation

Installation process is really simple:

  - [Download](https://github.com/nickola/web-console/releases/download/v0.9.7/webconsole-0.9.7.zip) latest version of the Web Console.
  - Unpack archive and open file `webconsole.php` in your favorite text editor.
  - At the beginning of the file enter your `$USER` and `$PASSWORD` credentials, edit any other settings that you like (see description in the comments).
  - Upload changed `webconsole.php` file to the web server and open it in the browser.

# Docker

Build and start container:

```
docker build -t web-console .
docker run --rm --name web-console -e USER=admin -e PASSWORD=password -p 8000:80 web-console
```

Now you can visit: http://localhost:8000

# About author

Web Console has been developed by [Nickolay Kovalev](http://nickola.ru). Also, various third-party components are used, see below.

# Used components

  - jQuery JavaScript Library: https://github.com/jquery/jquery
  - jQuery Terminal Emulator: https://github.com/jcubic/jquery.terminal
  - jQuery Mouse Wheel Plugin: https://github.com/brandonaaron/jquery-mousewheel
  - PHP JSON-RPC 2.0 Server/Client Implementation: https://github.com/sergeyfast/eazy-jsonrpc
  - Normalize.css: https://github.com/necolas/normalize.css

# URLs

 - GitHub: https://github.com/nickola/web-console
 - Website: http://nickola.ru/projects/web-console
 - Author: http://nickola.ru

# License

Web Console is licensed under [GNU LGPL Version 3](http://www.gnu.org/licenses/lgpl.html) license.
