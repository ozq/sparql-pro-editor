//TODO: #refactor: create CodeEditor class (!), not global variables and functions

var editor = buildCodeEditor();
var editorCopy = buildCodeEditorCopy(editor);
var wssparql = new WSparql();

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

function getEditorValue() {
    var query = editor.getValue();
    if ($('#buttonEnableWSparql').is(':checked')) {
        query = wssparql.toSparql(query);
    }
    return query;
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
