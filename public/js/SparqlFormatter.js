//TODO: Проверить регэкспы на предмет захвата лишних пробелов, точек, и т.п. В случае чего - поправить.
var triplePairsRegexpCode = '(?:(([?<$\\w][\\w:\\/\\.\\-#>]+)[\\s\\.]+){3}){2}';
var tripleLineRegexpCode = '(?:(?:[\\w]*[?<$:][\\w:\\/\\.\\-#>]+)[\\s\\.]+){3}';
var tripleElementsRegexpCode = '[?<$\\w:][\\w:\\/\\.\\-#>]+[?!\\w>]';
var allUriRegexpCode = '[\\w<]+\\:[\\w#\\/\\.-\ v\>-]+';
var singletonPropertyUri = '\<http://www.w3.org/1999/02/22-rdf-syntax-ns#singletonPropertyOf>';
var allPrefixesRegexpCode = '[\\w]+(?=:(?!\\/\\/))';
var excessLineRegexpCode = '(\\n\\s*){2}[^\\S\\t]';
var allIndents = '^[\\t ]+(?![\\n])(?=[\\S])';

function beautifyCode(content, indentLength) {
    return correctBrackets(
        removeExcessLines(
            removeExcessLinesInOperators(
                removeIndents(content)
            )
        ),
        indentLength
    );
}

function removeIndents(content) {
    return content.replace(new RegExp(allIndents, 'gm'), '');
}

function getStringWithIndents(indentDepth, indentLength, string) {
    return new Array(indentDepth * indentLength).join(' ') + string;
}

function removeAllOperatorsByName(content, name) {
    var operatorStartIndex = 0;
    var processContent = content;
    var operatorRegexp = new RegExp('[^}\\n]\\s*' + name + '\\s*{', 'i');

    do {
        // Find operator start index
        operatorStartIndex = processContent.search(operatorRegexp);
        if (operatorStartIndex >= 0) {
            var matchedBracket;
            var bracketsCounter = 0;
            var bracketsRegexp = new RegExp('[{}]', 'g');
            bracketsRegexp.lastIndex = operatorStartIndex;

            // Find operator last bracket index
            while (matchedBracket = bracketsRegexp.exec(processContent)) {
                bracketsRegexp.lastIndex = matchedBracket.index + 1;
                matchedBracket[0] === '{' ? bracketsCounter++ : false;
                matchedBracket[0] === '}' ? bracketsCounter-- : false;
                if (bracketsCounter === 0) {
                    // Replace all content from operator start index to operator last bracket index
                    var operatorContent = processContent.substring(operatorStartIndex, bracketsRegexp.lastIndex);
                    processContent = processContent.replace(operatorContent, '');
                    break;
                }
            }

            // Handle brackets nesting error
            if (bracketsCounter > 0) {
                console.log('SPARQL syntax error, check brackets nesting.');
                break;
            }
        }
    } while (operatorStartIndex >= 0);

    return processContent;
}

function removeExcessLines(content) {
    return content.replace(new RegExp(excessLineRegexpCode, 'gi'), '\r\n');
}

function removeExcessLinesInOperators(content) {
    var contentLines = content.split('\n');
    var indentDepth = 0;
    var formattedContent = [];
    var lineCount = contentLines.length;
    var emptyLineRegexp = new RegExp('^\\s+$', 'gm');
    var operatorContainRegexp = new RegExp('\\s*\\w+\\s*{', 'gm');

    for (var i = 0; i < lineCount; i++) {
        var currentString = contentLines[i];

        currentString.indexOf('{') > -1 ? indentDepth++ : false;
        currentString.indexOf('}') > -1 ? indentDepth-- : false;

        if (indentDepth >= 0) {
            var isCurrentLineEmpty = currentString.replace(/^\s+|\s+$/g, '') === '' || emptyLineRegexp.test(currentString);
            var nextLine = contentLines[i + 1];
            var isNextLineWithoutOperator = !operatorContainRegexp.test(nextLine);

            if (!(isCurrentLineEmpty && isNextLineWithoutOperator)) {
                formattedContent += currentString + '\r';
            }
        }
    }

    return formattedContent;
}

function expandUri(content, prefixes) {
    Object.keys(prefixes).map(function(prefix) {
        var url = prefixes[prefix];
        var replacedContent = content.replace(new RegExp(prefix + ':(\\w+)', 'gi'), function(match, property) {
            return '<' + url + property + '>';
        });
        replacedContent ? content = replacedContent : false;
    });

    return content;
}

function compactUri(content, prefixes) {
    Object.keys(prefixes).map(function(prefix) {
        var url = prefixes[prefix];
        var replacedContent = content.replace(new RegExp('\<' + url + '(\\w+)\>', 'gi'), function(match, property) {
            return prefix + '\:' + property;
        });
        replacedContent ? content = replacedContent : false;
    });

    return content;
}

function correctBrackets(content, indentLength) {
    var contentLines = content.split('\r');

    var indentDepth = 0;
    var formattedContent = [];
    var lineCount = contentLines.length;

    for (var i = 0; i < lineCount; i++) {
        var currentString = contentLines[i];
        if (currentString.indexOf('{') > -1) {
            currentString = getStringWithIndents(indentDepth, indentLength, currentString);
            indentDepth++;
        } else {
            if (currentString.indexOf('}') > -1) {
                indentDepth--;
            }
            currentString = getStringWithIndents(indentDepth, indentLength, currentString);
        }
        formattedContent.push(currentString);
    }

    return formattedContent.join('\r\n');
}

function removeSingletonProperties(content) {
    var singletonProperty = 'singletonPropertyOf';
    var triplePairsRegexp = new RegExp(triplePairsRegexpCode, 'gi');
    var triplePairLinesRegexp = new RegExp(tripleLineRegexpCode, 'gi');
    var triplePairElementsRegexp = new RegExp(tripleElementsRegexpCode, 'gi');

    var deletedUri = [];

    var result = content.replace(triplePairsRegexp, function(triplePair) {
        // Don't replace triple pair, if there is no singleton property
        if (triplePair.indexOf(singletonProperty) == -1) {
            return triplePair;
        }

        // Get triple pair lines
        var triplePairLines = triplePair.match(triplePairLinesRegexp);

        // Group triple pair lines
        var groupedTriplePair = triplePairLines[0].indexOf(singletonProperty) !== -1 ?
            triplePairLines[1] + triplePairLines[0] :
            triplePairLines[0] + triplePairLines[1];

        // Get triple pair elements
        var triplePairElements = groupedTriplePair.match(triplePairElementsRegexp).map(function(element) {
            return element.replace(/\.$/, '');
        });

        // Save predicate, if it is URI
        if (triplePairElements[1].charAt(0) !== '?') {
            deletedUri.push(triplePairElements[1]);
        }

        // If predicate on 1-st line is equal to subject on 2-nd line
        if (triplePairElements[1] === triplePairElements[3]) {
            // Build triple without singleton property
            return triplePairElements[0] + ' ' + triplePairElements[5] + ' ' + triplePairElements[2] + '.\r\n';
        } else {
            return triplePair;
        }
    });

    return {
        result: result,
        deleted_uri: deletedUri
    };
}

function addSingletonProperties(content) {
    var tripleLineRegexp = new RegExp(tripleLineRegexpCode, 'gi');
    var tripleElementsRegexp = new RegExp(tripleElementsRegexpCode, 'gi');
    var singletonPropertyNumber = 0;
    var replaceStartPosition = content.search('WHERE');

    return content.replace(tripleLineRegexp, function(triple, offset) {
        if (offset < replaceStartPosition) {
            return triple;
        }

        singletonPropertyNumber++;
        var singletonProperty = '?sp_' + singletonPropertyNumber;

        // Get triple elements
        var triplePairElements = triple.match(tripleElementsRegexp);

        // Build triple with singleton property
        return triplePairElements[0] + ' ' + singletonProperty + ' ' + triplePairElements[2] + '.\r\n' +
        singletonProperty + ' ' + singletonPropertyUri + ' ' + triplePairElements[1] + '.\r\n';
    });
}
