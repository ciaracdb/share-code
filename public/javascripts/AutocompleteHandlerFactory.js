var AutcompleteHandlerFactory = {
    create: function(editor, language) {
        switch(language) {
            default:
                return new JavaAutocompleteHandler(editor);
        }
    }
};

