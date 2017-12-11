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
            createShareLink: false,
            autocompleters: ["properties", "classes", "variables"]
        }
    );
}
function getDefinedPrefixes() {
    var result = null;
    var definedPrefixes = [];
    var regexp = new RegExp('PREFIX\\s(\\w+)\\:\\s(.*)', 'gmi');
    while (result = regexp.exec(editor.getValue())) {
        definedPrefixes[result[1]] = result[2];
    }
    return definedPrefixes;
}
function addPrefixes(prefixes) {
    var prefixLines = [];
    var lines = editor.getValue().split('\n');
    var selectIndex = null;
    var selectClauseRegexp = new RegExp('^SELECT\\s', 'gmi');
    _.forEach(prefixes, function(uri, prefix) {
       prefixLines.push('PREFIX ' + prefix + ': ' + '<' + uri + '>');
    });
    for (var i = 0; i <= lines.length; i++) {
        if (selectClauseRegexp.test(lines[i])) {
            selectIndex = i;
            break;
        }
    }
    if (_.isInteger(selectIndex)) {
        lines.splice(selectIndex, 0, ...prefixLines);
        editor.setValue(lines.join('\n'));
    }
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
