function JavaAutocompleteHandler(editor) {
    var self = this;
    self.editor = editor;
    self.document = editor.getSession().getDocument();
    self.analyzer = new JavaAnalyzer(editor);
    self.lastSuggestions = [];

    self.documentChanged = function(e, callback) {
        var cursorPosition = self.editor.getCursorPosition();
        var lineStart = self.document.getLine(cursorPosition.row).substring(0, cursorPosition.column);

        var matches;
        if(matches = lineStart.match(/.*this\.$/)) {
            self.autocompleteVariableOrMethod('', callback, true);
        } else if(matches = lineStart.match(/.*[\.|\s]+(\w+)\.(\w*)$/)) {
            self.autocompleteMethodOf(matches[1], matches[2], callback);
        } else if(matches = lineStart.match(/.*[\.|\s]+(\w+)$/)) {
            self.autocompleteVariableOrMethod(matches[1], callback);
        } else {
            callback([]);
        }
    };

    self.autocompleteVariableOrMethod = function(firstLetters, callback, removeThis) {
        var suggestions = [];

        var variablesList = self.analyzer.getVariablesList();
        var methodsList = self.analyzer.getMethodsList();

        var list = variablesList.concat(methodsList);

        console.log(self.lastSuggestions);
        list.sort(function(a, b) {
            var indexA = self.lastSuggestions.indexOf(a.name);
            var indexB = self.lastSuggestions.indexOf(b.name);

            if(indexA == -1 && indexB == -1) {
                return ((a.freq > b.freq) ? -1 : ((a.freq == b.freq) ? 0 : 1));
            } else if(indexA > -1 && indexB > -1) {
                return indexA > indexB ? -1 : 1;
            } else {
                return indexA > -1 ? -1 : 1;
            }
        });

        var currentMethod = self.analyzer.getCurrentMethod();

        $.each(list, function(index, elem) {
            if((removeThis && elem.name == 'this') || elem.name == currentMethod.name) {
                return;
            }
            if(elem.name.substring(0, firstLetters.length) == firstLetters) {
                if(elem.parameters != undefined) {
                    suggestions.push({
                        autocomplete: elem.name.substring(firstLetters.length) + '()',
                        cursorMove: -1,
                        show: elem.name + '(' + elem.parameters + ') : ' + elem.type,
                        save: elem.name
                    });
                } else {
                    suggestions.push({
                        autocomplete: elem.name.substring(firstLetters.length),
                        cursorMove: 0,
                        show: elem.name + ' : ' + elem.type,
                        save: elem.name
                    });
                }

            }
        });
        callback(suggestions);
    };


    self.autocompleteMethodOf = function(varName, firstLetters, callback) {
        var analysis = self.analyzer.analyzeVariable(varName);
        self.encodeContext(analysis, function(encodedVector, inMethods, callableMethods, matrix) {
            if(encodedVector == 'error') {
                callback([]);
                return;
            }
            // distances
            var indexOfLast1 = encodedVector.lastIndexOf('1');
            var callableMethodsWithDistances = [];
            for(var i = 0; i < matrix.length; i++) {
                var incompleteVector1 = encodedVector.substring(0, indexOfLast1 + 1);
                var incompleteVector2 = matrix[i].substring(0, indexOfLast1 + 1);
                callableMethodsWithDistances[i] = {
                    callableMethods: matrix[i].slice(inMethods.length),
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
                            callableMethod: callableMethods[j],
                            alreadyCalled: encodedVector[inMethods.length + j] == '1',
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
                if(method.callableMethod.name.substring(0, firstLetters.length) == firstLetters) {
                    var autocomplete;
                    if(method.callableMethod.name == 'new')
                        autocomplete = ' = new ' + analysis.type + '()';
                    else
                        autocomplete = method.callableMethod.name + '()';
                    suggestions.push({
                        autocomplete: autocomplete.substring(firstLetters.length),
                        cursorMove: -1,
                        show: method.callableMethod.name + '(' + method.callableMethod.parameters + ') : ' + method.callableMethod.type,
                        save: null
                    });
                }
            });

            callback(suggestions);
        });
    };

    self.encodeContext = function(analysis, callback) {
        if(!analysis.type) {
            callback('error');
            return;
        }
        $.post('/matrix', {type: analysis.type},
            function(data) {
                var encodedVector = '';

                $.each(data.inMethods, function(index, method) {
                    if(method.className == analysis.className && method.name == analysis.method.name)
                        encodedVector += '1';
                    else
                        encodedVector += '0';
                });

                $.each(data.callableMethods, function(index, method) {
                    encodedVector += (analysis.calledMethodsNames.indexOf(method.name) > -1) ? '1' : '0';
                });

                callback(encodedVector, data.inMethods, data.callableMethods, data.matrix);
            });
    };

    self.hamming = function(str1, str2) {
        var count = 0;
        for(var i = 0; i < str1.length; i++) {
            count += str1[i] == str2[i];
        }

        return count;
    };

    self.accept = function(saved) {
        if(saved) {
            if ((index = self.lastSuggestions.indexOf(saved)) > -1) {
                self.lastSuggestions.splice(index, 1);
            }

            self.lastSuggestions.push(saved);
        }
    };
}