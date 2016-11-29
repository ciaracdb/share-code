function JavaAnalyzer(editor) {
    var self = this;
    self.editor = editor;
    self.document = editor.getSession().getDocument();

    self.getVariablesList = function() {
        var code = self.document.getAllLines().join('\n');
        var varRegex = /(\w+)\s+([a-zA-z0-9, ]+)(;|=.+;)/g;
        var result;
        var variablesList = [{
            name: 'this',
            type: self.getCurrentClass(),
            freq: self.countVariableUse(code, 'this')
        }];
        while(result = varRegex.exec(code)) {
            var varNames = result[2].split(',');
            if(varNames.length > 1) {
                $.each(varNames, function(index, varName) {
                    variablesList.push({
                        name: varName.replace(' ', ''),
                        type: result[1],
                        freq: self.countVariableUse(code, varName.replace(' ', ''))
                    });
                });
            } else {
                variablesList.push({
                    name: result[2].replace(' ', ''),
                    type: result[1],
                    freq: self.countVariableUse(code, result[2].replace(' ', ''))
                });
            }
        }

        return variablesList;
    };

    self.getMethodsList = function() {
        var code = self.document.getAllLines().join('\n');
        var methodRegex = /(\w+)\s+(\w+)\s*\((.*)\)\s*\{/g;
        var result;
        var methodsList = [];
        while(result = methodRegex.exec(code)) {
            methodsList.push({
                name: result[2],
                type: result[1],
                parameters: result[3],
                freq: self.countVariableUse(code, result[2])
            });
        }

        return methodsList;
    };

    self.countVariableUse = function(str, varName) {
        return (str.match(new RegExp('[\\.\\s\\(]+' + varName, 'g')) || []).length;
    };

    self.getCurrentClass = function() {
        var code = self.document.getAllLines().join('\n');
        return code.match(/class\s+(\w+)\s+/).pop();
    };

    self.getCurrentMethod = function() {
        var cursorPosition = self.editor.getCursorPosition();
        var code = self.document.getAllLines().join('\n');
        var methodRegex = /(\w+)\s+(\w+)\s*\((.*)\)\s*\{/g;
        var result;
        var method = {};
        while(result = methodRegex.exec(code)) {
            if(result.index < self.document.positionToIndex(cursorPosition)) {
                method.name = result[2];
                method.type = result[1];
                method.parameters = result[3];
            }
        }

        return method;
    };

    self.analyzeVariable = function(varName) {
        var res = {};

        // variable type
        var variablesList = self.getVariablesList();
        $.each(variablesList, function(index, variable) {
            if(variable.name == varName) {
                res.type = variable.type;
            }
        });

        // Classes
        var code = self.document.getAllLines().join('\n');
        res.className = code.match(/(extends)\s*(\w+)/).pop();

        // method in which the variable is written
        res.method = self.getCurrentMethod()

        res.calledMethodsNames = [];
        var calledMethodRegex = new RegExp(varName + '\\.(\\w+)\\(.*\\)\s*;', 'g');
        while(result = calledMethodRegex.exec(code)) {
            res.calledMethodsNames.push(result[1]);
        }

        var constructorRegex = new RegExp('\\s+' + varName + '\\s*=\\s*new\\s+.+;', '');
        if(code.match(constructorRegex)) {
            res.calledMethodsNames.push('new');
        }

        return res;
    };
}