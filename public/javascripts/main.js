$(function() {
    var ce = new CollaborativeEditor('editor', 'ws://localhost:3000/ws');
    ce.openDocument('code', 'example.java');
    ce.setAutocompleMode('java');
});

