export default class CodeEditor {
    constructor(configuration) {
        this.editor = this.buildCodeEditor();
        this.editorCopy = this.buildCodeEditorCopy(this.editor);
        this.wSparql = configuration.wSparql;
        this.appConfig = configuration.appConfig;
    };

    buildCodeEditor() {
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

    getDefinedPrefixes() {
        let result = null;
        let definedPrefixes = [];
        let regexp = new RegExp('PREFIX\\s(\\w+)\\:\\s(.*)', 'gmi');
        while (result = regexp.exec(this.editor.getValue())) {
            definedPrefixes[result[1]] = result[2];
        }
        return definedPrefixes;
    }

    addPrefixes(prefixes) {
        let prefixLines = [];
        let lines = this.editor.getValue().split('\n');
        let selectIndex = null;
        let selectClauseRegexp = new RegExp('^SELECT\\s', 'gmi');
        _.forEach(prefixes, function(uri, prefix) {
            prefixLines.push('PREFIX ' + prefix + ': ' + '<' + uri + '>');
        });
        for (let i = 0; i <= lines.length; i++) {
            if (selectClauseRegexp.test(lines[i])) {
                selectIndex = i;
                break;
            }
        }
        if (_.isInteger(selectIndex)) {
            lines.splice(selectIndex, 0, ...prefixLines);
            this.editor.setValue(lines.join('\n'));
        }
    }

    setValue(value) {
        this.editor.setValue(value);
    }

    getEditorValue(smart = false) {
        let query = this.editor.getValue();
        if (smart === true) {
            if (this.appConfig.isWSparqlEnabled()) {
                query = this.wSparql.toSparql(query);
            }
        }
        return query;
    }

    toggleEditorCopy(showCopy) {
        if (showCopy) {
            $('.editors .yasqe:last-child').css('z-index', '2');
            $('.editors .yasqe:first-child').css('z-index', '1');
        } else {
            this.editorCopy.setValue(this.editor.getValue());
            $('.editors .yasqe:last-child').css('z-index', '1');
            $('.editors .yasqe:first-child').css('z-index', '2');
        }
    }

    insertString(str) {
        if (this.editor.getSelection().length > 0) {
            this.editor.replaceSelection(str);
        } else {
            let doc = this.editor.getDoc();
            let cursor = doc.getCursor();
            let pos = {
                line: cursor.line,
                ch: cursor.ch
            };
            doc.replaceRange(str, pos);
        }
    }

    buildCodeEditorCopy(editor) {
        let editorCopy = YASQE.fromTextArea(
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
}
