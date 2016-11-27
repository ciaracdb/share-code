var AutcompleteHandlerFactory = {
    create: function(language) {
        switch(language) {
            default:
                return new JavaAutocompleteHandler();
        }
    }
};

