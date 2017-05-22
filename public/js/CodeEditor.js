var editor = buildCodeEditor();

function buildCodeEditor() {
    return YASQE.fromTextArea(
        document.getElementById('yasqe'),
        {
            mode: 'sparql11',
            indentUnit: 4
        }
    );
}
