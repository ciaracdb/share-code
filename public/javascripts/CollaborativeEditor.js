// arg1 = HTML id attribute of the element which will contain the editor
// arg2 = url of the websocket which use the ShareDB library
function CollaborativeEditor(editorId, socketURL) {
    var self = this;
    self.dontAutoComplete = false;

    // Ace Editor link and settings
    self.editor = ace.edit(editorId);

    self.setTheme = function(theme) {
        self.editor.setTheme('ace/theme/'+theme);
    };
    self.setTheme('monokai');

    // create autocomplete popup
    if($('#autocomplete').length == 0)
        $('body').append('<div id="autocomplete"><ul></ul></div>');

    // insert autocomplete on click
    $('#autocomplete').on('click', 'li', function(event) {
        $('#autocomplete').hide();
        self.editor.focus();

        self.dontAutoComplete = true;
        self.editor.insert(''+$(this).data('value'));
        self.dontAutoComplete = false;

        var cursor = self.editor.getCursorPosition();
        var cursorMove = parseInt($(this).data('cursor-move'));
        self.editor.gotoLine(cursor.row+1, cursor.column+cursorMove);

        self.autcompleteHandler.accept(JSON.parse($(this).data('save')));
        event.stopPropagation();
    });

    // Close autocomplete popup on click
    $('#editor').on('click', function(event) {
        $('#autocomplete').hide();
    });

    // text documents are synchronized
    ShareDB.types.register(otText.type);

    // Connection to BDD
    var socket = new WebSocket(socketURL);
    self.connection = new ShareDB.Connection(socket);
    self.aceDocument = self.editor.getSession().getDocument();
    self.document = self.aceDocument;
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

    // enable language syntaxe recognition and autocompletion
    self.setAutocompleMode = function(mode) {
        self.editor.getSession().setMode('ace/mode/' + mode);
        self.autcompleteHandler = AutcompleteHandlerFactory.create(self.editor, mode);
        self.document.on('change', function(e) {
            if(!self.dontTriggerChange && !self.dontAutoComplete && e.action == 'insert') {
                self.autcompleteHandler.documentChanged(e, function(suggestions) {
                    if(suggestions.length > 0) {
                        var cursorPosition = self.editor.renderer.$cursorLayer.getPixelPosition(self.editor.getCursorPosition());
                        $('#autocomplete ul').html('');
                        $.each(suggestions, function(index, suggestion) {
                            $('<li>' + suggestion.show + '</li>')
                                .data('value', suggestion.autocomplete)
                                .data('cursor-move', suggestion.cursorMove)
                                .data('save', JSON.stringify(suggestion.save))
                                .appendTo('#autocomplete ul');
                                //.append('<li data-value="' + suggestion.autocomplete + '" data-cursor-move="' + suggestion.cursorMove + '">' + suggestion.show + '</li>')
                        });
                        $('#autocomplete')
                            .css({top: cursorPosition.top + 15 + 'px', left: cursorPosition.left + 50 + 'px'})
                            .show();
                    } else {
                        $('#autocomplete').hide();
                    }
                });
            }
        });
    };

    self.openDocument = function(collection, documentName) {
        self.dontTriggerChange = false;
        self.shareDocument = self.connection.get(collection, documentName);

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