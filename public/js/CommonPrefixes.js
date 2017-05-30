function getCommonPrefixesContent()
{
    return JSON.parse(localStorage.getItem('commonPrefixes'));
}

function getCommonPrefixesArray() {
    var commonPrefixesContent = getCommonPrefixesContent();
    var commonPrefixesArray = [];

    if (commonPrefixesContent) {
        commonPrefixesContent.forEach(function(item, i) {
            var prefixData = item.replace(new RegExp('PREFIX\\s*', 'i'), '');
            var matchedPrefixData = prefixData.match(new RegExp('(\\w+):\<(.+)\>'));
            if (matchedPrefixData) {
                commonPrefixesArray[matchedPrefixData[1]] = matchedPrefixData[2];
            }
        });
    }

    return commonPrefixesArray;
}

function getCommonPrefixesTextArea() {
    return document.getElementsByClassName('common-prefixes-textarea')[0];
}

function setCommonPrefixesData(data) {
    localStorage.setItem('commonPrefixes', JSON.stringify(data));
}

function initCommonPrefixesData() {
    var data = getCommonPrefixesContent();
    if (data) {
        getCommonPrefixesTextArea().value = data.join('\n');
    }
}

editor.on('change', function(editor) {
    var sparqlFormatter = new SparqlFormatter();
    var definedQueryPrefixes = Object.keys(editor.getPrefixesFromQuery());
    var allQueryPrefixes = _.uniq(editor.getValue().match(new RegExp(sparqlFormatter.allPrefixesRegexpCode, 'gi')));
    var queryUndefinedPrefixes = _.difference(allQueryPrefixes, definedQueryPrefixes);
    var commonPrefixes = getCommonPrefixesArray();
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
