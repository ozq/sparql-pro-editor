class CommonPrefixes {
    constructor(editor) {
        this.key = 'spe.commonPrefixes';
        this.editor = editor;
        this.defaultPrefixes = [
            'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>',
            'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>',
            'PREFIX owl: <http://www.w3.org/2002/07/owl#>',
            'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>',
        ];
        this.initData();
        this.initListeners();
    }

    getData() {
        return JSON.parse(localStorage.getItem(this.key));
    }

    getArray() {
        var commonPrefixesContent = this.getData();
        var commonPrefixesArray = [];

        if (commonPrefixesContent) {
            commonPrefixesContent.forEach(function(item, i) {
                var prefixData = item.replace(new RegExp('PREFIX\\s*', 'i'), '');
                var matchedPrefixData = prefixData.match(new RegExp('(\\w+)\\s*:\\s*\<(.+)\>'));
                if (matchedPrefixData) {
                    commonPrefixesArray[matchedPrefixData[1]] = matchedPrefixData[2];
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
        var data = _.uniq(this.defaultPrefixes.concat(this.getData()));
        if (data) {
            this.setData(data);
            this.getTextArea().value = data.join('\n');
        }
    }

    initListeners() {
        var self = this;
        var sparqlFormatter = new SparqlFormatter();
        self.editor.on('change', function (editor) {
            var previousCursor = editor.getCursor();
            var definedQueryPrefixes = Object.keys(getDefinedPrefixes());
            var allQueryPrefixes = _.uniq(editor.getValue().match(new RegExp(sparqlFormatter.allPrefixesRegexpCode, 'gi')));
            var queryUndefinedPrefixes = _.difference(allQueryPrefixes, definedQueryPrefixes);
            var commonPrefixes = self.getArray();
            var newQueryPrefixes = {};
            queryUndefinedPrefixes.map(function(prefix) {
                if (commonPrefixes.hasOwnProperty(prefix)) {
                    newQueryPrefixes[prefix] = commonPrefixes[prefix];
                }
            });
            if (!_.isEmpty(newQueryPrefixes)) {
                addPrefixes(newQueryPrefixes);
                previousCursor.line += Object.keys(newQueryPrefixes).length;
                editor.setCursor(previousCursor);
            }
        });
    }
}
