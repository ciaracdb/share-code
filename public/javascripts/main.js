$(function() {
    var editor = new CollaborativeEditor('editor', 'ws://localhost:3000/ws');
    editor.openDocument('example.java');
    editor.document.on('change', function(e) {
        var cursorPosition = editor.editor.renderer.$cursorLayer.getPixelPosition(editor.editor.getCursorPosition());

        if(e.action == 'insert' && e.lines.join('\n') == '.') {
            $('#autocomplete')
                .css({top: cursorPosition.top + 15 + 'px', left: cursorPosition.left + 50 + 'px'})
                .show();
        }
    });

    $('#autocomplete li').on('click', function(event) {
        console.log($(this).data('value'));
        $('#autocomplete').hide();
        editor.editor.focus();
        editor.editor.insert($(this).data('value'));
        var cursor = editor.editor.getCursorPosition();
        editor.editor.gotoLine(cursor.row+1, cursor.column-1);
        event.stopPropagation();
    });

    $('#editor').on('click', function(event) {
        $('#autocomplete').hide();
    });
});

