# page-change-watcher

Watches a list of URLs until they contain some specified text, then notify you over AWS SNS (eg. through SMS or email).

To use:
1. Rename `config-example.json` to `config.json`
2. Fill in the fields in `config.json`. All are required except for "watchers.headers"
3. Set up an AWS SNS topic to notify you when published to (eg. through email, SMS, etc.)
4. Run `node ./watcher.js` and you will get notified when the page body contains the text you specified. Once it gets a match, it will mark a file called status.json to say that it has notified for that url. If you want it to start notifying again, change the status or delete the file.
You can also use `pm2 start watcher.js` to have it run in the background using `pm2`.
