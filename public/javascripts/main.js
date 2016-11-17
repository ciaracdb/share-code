$(function () {
    var editor = new CollaborativeEditor('editor', 'ws://localhost:3000/ws');
    editor.openDocument('example.java');
});