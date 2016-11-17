function CollaborativeEditor(editorTag, socketURL) {
    var self = this;
    // Ace Editor link and settings
    self.editor = ace.edit(editorTag);
    self.editor.setTheme("ace/theme/monokai");
    self.editor.getSession().setMode("ace/mode/typescript");
    self.editor.setOptions({
        maxLines: 50
    });

    // text documents are synchronized
    ShareDB.types.register(otText.type);

    // Connection to BDD
    var socket = new WebSocket(socketURL);
    self.connection = new ShareDB.Connection(socket);
    self.aceDocument = self.editor.getSession().getDocument();
    self.shareDocument = null;
    self.dontTriggerChange = true;
    self.savedLines = [];

    // send changes to bdd
    self.aceDocument.on('change', function(e) {
        if(!self.dontTriggerChange) { // don't trigger change if it came from the bdd
            var op;
            if(e.action == 'insert') {
                var start = self.aceDocument.positionToIndex(e.start);
                var lines = e.lines.join('\n');
                op = [start, lines];
            } else if(e.action == 'remove') {
                var start = self.aceDocument.positionToIndex(e.start);
                var end = e.lines.join('\n').length;

                op = [start, {d: end}];
            }
            self.shareDocument.submitOp(op, {source: 'me'});
            self.savedLines = self.aceDocument.getAllLines();
        }
    });

    self.openDocument = function(documentName) {
        self.dontTriggerChange = false;
        self.shareDocument = self.connection.get('code', documentName);

        // first subscription to bdd
        self.shareDocument.subscribe(function(err) {
            if(err)
                throw err;
            // set content of the bdd document to the local document
            if(self.shareDocument.data) {
                self.dontTriggerChange = true;
                self.aceDocument.setValue(self.shareDocument.data);
                self.dontTriggerChange = false;
            }

            self.savedLines = self.aceDocument.getAllLines();

            // receive and apply changes to local document
            self.shareDocument.on('op', function(op, source) {
                // If I'm the owner of the operation, no need to change
                if(source === 'me')
                    return;

                var cursor = 0;
                $.each(op, function(index, i) {
                    if(typeof i === 'number') {
                        cursor += i;
                    } else if(typeof i === 'string') {
                        var str = i;
                        var start = self.aceDocument.indexToPosition(cursor);
                        var lines = str.split('\n');
                        end = {row: (start.row + lines.length - 1), column: lines[lines.length - 1].length};
                        var delta = {action: 'insert', start: start, end: end, lines: lines};

                        self.dontTriggerChange = true;
                        self.aceDocument.applyDeltas([delta]);
                        self.dontTriggerChange = false;

                        cursor += str.length;
                    } else {
                        var start = self.aceDocument.indexToPosition(cursor);
                        var end = self.aceDocument.indexToPosition(cursor + i.d);
                        var lines = [];
                        var delta = {action: 'remove', start: start, end: end, lines: lines};

                        self.dontTriggerChange = true;
                        self.aceDocument.applyDeltas([delta]);
                        self.dontTriggerChange = false;
                    }
                });
            });
        });
    };

}