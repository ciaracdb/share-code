function JavaAutocompleteHandler() {
    var self = this;

    self.documentChanged = function(e, editor, callback) {
        if(e.action == 'insert' && e.lines.join('\n') == '.') {
            self.autocompleteMethod(editor, callback);
        }

        callback([]);
    };


    self.autocompleteMethod = function(editor, callback) {
        var analysis = self.analyzeDocument(editor);
        self.encodeContext(analysis, function(encodedVector, inMethodsNames, callableMethodsNames, matrix) {
            // distances
            var indexOfLast1 = encodedVector.lastIndexOf('1');
            var callableMethodsWithDistances = [];
            for(var i = 0; i < matrix.length; i++) {
                var incompleteVector1 = encodedVector.substring(0, indexOfLast1 + 1);
                var incompleteVector2 = matrix[i].substring(0, indexOfLast1 + 1);
                callableMethodsWithDistances[i] = {
                    callableMethods: matrix[i].slice(inMethodsNames.length),
                    distance: Math.sqrt(self.hamming(incompleteVector1, incompleteVector2))
                }
            }

            // K nearest neighbours
            callableMethodsWithDistances.sort(function(a, b) {
                return ((a.distance > b.distance) ? -1 : ((a.distance == b.distance) ? 0 : 1));
            });
            var k = 4;
            var k_neighboours = callableMethodsWithDistances.slice(0, k);

            // probabilities of method calls
            var methods = [];
            for(i = 0; i < k_neighboours.length; i++) {
                for(var j = 0; j < k_neighboours[0].callableMethods.length; j++) {
                    if(!methods[j]) {
                        methods[j] = {
                            callableMethod: callableMethodsNames[j],
                            alreadyCalled: encodedVector[inMethodsNames.length+j] == '1',
                            occurences: 0
                        };
                    }

                    methods[j].occurences += k_neighboours[i].callableMethods[j] == '1' ? 1 : 0;
                }
            }

            methods.sort(function(a, b) {
                if(a.alreadyCalled < b.alreadyCalled)
                    return -1;
                else if(a.alreadyCalled == b.alreadyCalled)
                    return ((a.occurences > b.occurences) ? -1 : ((a.occurences == b.occurences) ? 0 : 1));
                else
                    return 1;
            });

            var suggestions = [];
            $.each(methods, function(index, method) {
                var autocomplete;
                if(method.callableMethod == 'new')
                    autocomplete = ' = new '+analysis.type+'()';
                else
                    autocomplete = method.callableMethod.replace(/(\w+)\((.*)\)/, '$2')+'()';
                suggestions.push({
                    autocomplete: autocomplete,
                    cursorMove: -1,
                    show: method.callableMethod
                });
            });

            callback(suggestions);
        });
    };

    self.encodeContext = function(analysis, callback) {
        $.post('/matrix', {type: analysis.type},
            function(data) {
                var encodedVector = '';

                $.each(data.inMethodsNames, function(index, classMethod) {
                    encodedVector += (classMethod == analysis.className + '.' + analysis.method) ? '1' : '0';
                });

                $.each(data.callableMethodsNames, function(index, method) {
                    encodedVector += (analysis.calledMethods.indexOf(method) > -1) ? '1' : '0';
                });

                callback(encodedVector, data.inMethodsNames, data.callableMethodsNames, data.matrix);
            });
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
        var typeRegex = new RegExp('(\\w+)\\s+' + varName + '\\s*(;|=.+;)', '');
        res.type = code.match(typeRegex)[1];

        res.calledMethods = [];
        var calledMethodRegex = new RegExp(varName + '\\.(\\w+)\\(.*\\)\s*;', 'g');
        while(result = calledMethodRegex.exec(code)) {
            res.calledMethods.push(result[1]);
        }

        var constructorRegex = new RegExp('\\s+' + varName + '\\s*=\\s*new\\s+.+;', '');
        if(code.match(constructorRegex)) {
            res.calledMethods.push('new');
        }

        return res;
    };

    self.hamming = function(str1, str2) {
        var count = 0;
        for(var i = 0; i < str1.length; i++) {
            count += str1[i] == str2[i];
        }

        return count;
    }
}