var editor = buildCodeEditor();
var editorCopy = buildCodeEditorCopy(editor);

function buildCodeEditor() {
    return YASQE.fromTextArea(
        document.getElementById('editor'),
        {
            mode: 'sparql11',
            indentUnit: 4,
            createShareLink: false
        }
    );
}

function buildCodeEditorCopy(editor) {
    var editorCopy = YASQE.fromTextArea(
        document.getElementById('editorCopy'),
        editor.options
    );
    editorCopy.setOption('readOnly', true);

    editorCopy.setValue(editor.getValue());
    editor.on('change', function() {
        editorCopy.setValue(editor.getValue());
    });

    return editorCopy;
}
