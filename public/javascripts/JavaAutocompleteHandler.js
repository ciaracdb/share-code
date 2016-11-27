function JavaAutocompleteHandler() {
    var self = this;

    self.documentChanged = function(e, editor, callback) {
        if(e.action == 'insert' && e.lines.join('\n') == '.') {
            self.autocompleteMethod(editor, callback);
        }

        callback([]);
    };

    self.analyzeDocument = function(editor) {
        var res = {};
        var document = editor.getSession().getDocument();

        // Classes
        var code = document.getAllLines().join('\n');
        res.className = code.match(/(extends)\s*(\w+)/).pop();

        // Variable name
        var cursorPosition = editor.getCursorPosition();
        var lineStart = document.getLine(cursorPosition.row).substring(0, cursorPosition.column - 1);
        var varName = lineStart.split(' ').pop().split('.').pop();

        // variable method
        var methodRegex = /\w+\s+(\w+)\s*\(.*\)\s*\n*\s*(\{)/g;
        var result;
        while(result = methodRegex.exec(code)) {
            if(result.index < document.positionToIndex(cursorPosition)) {
                res.method = result[1];
            }
        }

        // variable type
        var typeRegex = new RegExp('(\\w+)\\s+'+varName+'\\s*(;|=.+;)', '');
        res.type = code.match(typeRegex)[1];

        res.calledMethods = [];
        var calledMethodRegex = new RegExp(varName+'\\.(\\w+)\\(.*\\)\s*;', 'g');
        while(result = calledMethodRegex.exec(code)) {
            res.calledMethods.push(result[1]);
        }

        var constructorRegex = new RegExp('\\s+'+varName+'\\s*=\\s*new\\s+.+;', '');
        if(code.match(constructorRegex)) {
            res.calledMethods.push('new');
        }

        return res;
    };

    self.autocompleteMethod = function(editor, callback) {
        var analysis = self.analyzeDocument(editor);
        console.log(analysis);
        $.post('/best-matching', analysis,
            function(data) {
                console.log(data);
            });
        callback([]);
    }
}