class CommonPrefixes {
    constructor(editor) {
        this.key = 'spe.commonPrefixes';
        this.editor = editor;
        this.initData();
        this.initListeners();
    }

    getContent() {
        return JSON.parse(localStorage.getItem(this.key));
    }

    getArray() {
        var commonPrefixesContent = this.getContent();
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
        var data = this.getContent();
        if (data) {
            this.getTextArea().value = data.join('\n');
        }
    }

    initListeners() {
        var thisObject = this;
        var editor = thisObject.editor;
        var sparqlFormatter = new SparqlFormatter();
        editor.on('change', function(editor) {
            var definedQueryPrefixes = Object.keys(editor.getPrefixesFromQuery());
            var allQueryPrefixes = _.uniq(editor.getValue().match(new RegExp(sparqlFormatter.allPrefixesRegexpCode, 'gi')));
            var queryUndefinedPrefixes = _.difference(allQueryPrefixes, definedQueryPrefixes);
            var commonPrefixes = thisObject.getArray();
            var newQueryPrefixes = {};

            queryUndefinedPrefixes.map(function(prefix) {
                if (commonPrefixes.hasOwnProperty(prefix)) {
                    newQueryPrefixes[prefix] = commonPrefixes[prefix];
                }
            });

            if (!_.isEmpty(newQueryPrefixes)) {
                editor.addPrefixes(newQueryPrefixes);
            }
        });
    }
}
