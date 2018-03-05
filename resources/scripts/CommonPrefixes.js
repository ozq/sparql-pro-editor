export default class CommonPrefixes {
    constructor(configuration) {
        this.key = 'spe.commonPrefixes';
        this.codeEditor = configuration.codeEditor;
        this.sparqlFormatter = configuration.sparqlFormatter;
        this.initData();
        this.initListeners();
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.key));
    }

    getArray() {
        let commonPrefixesContent = this.getData();
        let commonPrefixesArray = [];

        if (commonPrefixesContent) {
            commonPrefixesContent.forEach(function (item) {
                if (item) {
                    let prefixData = item.replace(new RegExp('PREFIX\\s*', 'i'), '');
                    let matchedPrefixData = prefixData.match(new RegExp('(\\w+)\\s*:\\s*\<(.+)\>'));
                    if (matchedPrefixData) {
                        commonPrefixesArray[matchedPrefixData[1]] = matchedPrefixData[2];
                    }
                }
            });
        }

        return commonPrefixesArray;
    }

    getTextArea() {
        return document.getElementsByClassName('common-prefixes-textarea')[0];
    }

    setData(data) {
        localStorage.setItem(this.key, JSON.stringify(data));
    }

    initData() {
        let commonPrefixes = _.merge(this.sparqlFormatter.additionalPrefixes, Object.assign({}, this.getArray()));
        if (commonPrefixes) {
            let data = [];
            Object.keys(commonPrefixes).map(function(prefix) {
                data.push('PREFIX ' + prefix + ': ' + '<' + commonPrefixes[prefix] + '>');
            });
            this.setData(data);
            this.getTextArea().value = data.join('\n');
        }
    }

    initListeners() {
        let self = this;
        self.codeEditor.editor.on('change', function (editor) {
            let previousCursor = editor.getCursor();
            let definedQueryPrefixes = Object.keys(self.codeEditor.getDefinedPrefixes());
            let allQueryPrefixes = _.uniq(editor.getValue().match(new RegExp(self.sparqlFormatter.allPrefixesRegexpCode, 'gi')));
            let queryUndefinedPrefixes = _.difference(allQueryPrefixes, definedQueryPrefixes);
            let commonPrefixes = self.getArray();
            let newQueryPrefixes = {};
            queryUndefinedPrefixes.map(function(prefix) {
                if (commonPrefixes.hasOwnProperty(prefix)) {
                    newQueryPrefixes[prefix] = commonPrefixes[prefix];
                }
            });
            if (!_.isEmpty(newQueryPrefixes)) {
                self.codeEditor.addPrefixes(newQueryPrefixes);
                previousCursor.line += Object.keys(newQueryPrefixes).length;
                editor.setCursor(previousCursor);
            }
        });
    }
}
