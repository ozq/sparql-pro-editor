/** Init Yasqe Editor **/
var editor = YASQE.fromTextArea(
    document.getElementById('yasqe'),
    {
        mode: 'sparql11',
        indentUnit: 4
    }
);

/** Toolbar buttons **/
function deleteIndents()
{
    YASQE.commands['selectAll'](editor);
    editor.indentSelection('prev');
}

function getStringWithIndents(indentDepth, string) {
    return new Array(indentDepth * editor.options.indentUnit).join(' ') + string;
}

function removeAllOperatorsByName(name) {
    //TODO: consider nested brackets!!!
    var regexp = new RegExp(name + '\\s*{[^}]*}', 'ig');
    var newContent = editor.getValue().replace(regexp, '');
    editor.setValue(newContent);
}

$('#buttonBeautify').click(function() {
    deleteIndents();

    var indentDepth = 0;
    var formattedContent = [];
    var lineCount = editor.lineCount();

    for (var i = 0; i < lineCount; i++) {
        var currentString = editor.getLine(i);
        if (currentString.indexOf('{') > -1) {
            currentString = getStringWithIndents(indentDepth, currentString);
            indentDepth++;
        } else {
            if (currentString.indexOf('}') > -1) {
                indentDepth--;
            }
            currentString = getStringWithIndents(indentDepth, currentString);
        }
        formattedContent.push(currentString);
    }

    editor.setValue(formattedContent.join('\r\n'));
});

$('#buttonRemoveMinus').click(function() {
    removeAllOperatorsByName('minus');
});
