class SparqlFormatter {
    constructor(options) {
        //TODO: check regexp, they may be not "clear" (match excess whitespaces and dots)
        this.triplePairsRegexpCode = '(?:(([?<$\\w][\\w:\\/\\.\\-#>]+)[\\s\\.]+){3}){2}';
        this.tripleLineRegexpCode = '(?:(?:[\\w]*[?<$:][\\w:\\/\\.\\-#>]+)[\\s\\.]+){3}';
        this.tripleElementsRegexpCode = '[?<$\\w:][\\w:\\/\\.\\-#>]+[?!\\w>]';
        this.allUriRegexpCode = '[\\w<]+\\:[\\w#\\/\\.-\ v\>-]+';
        this.singletonPropertyUri = '\<http://www.w3.org/1999/02/22-rdf-syntax-ns#singletonPropertyOf>';
        this.allPrefixesRegexpCode = '[\\w]+(?=:(?!\\/\\/))';
        this.excessLineRegexpCode = '(\\n\\s*){2}[^\\S\\t]';
        this.allIndentsRegexpCode = '^[\\t ]+(?![\\n])(?=[\\S])';
        this.variablesRegexpCode = '[?$]\\w+';

        this.indentLength = options && options.indentLength ? options.indentLength : 4;
    }

    beautify(content) {
        return this.correctBrackets(
            this.removeExcessLinesInOperators(
                this.removeExcessLines(
                    this.removeIndents(content)
                )
            )
        );
    }

    correctBrackets(content) {
        var contentLines = content.split('\n');

        var indentDepth = 0;
        var formattedContent = [];
        var lineCount = contentLines.length;

        for (var i = 0; i < lineCount; i++) {
            var currentString = contentLines[i];
            if (currentString.indexOf('{') > -1) {
                currentString = this.getStringWithIndents(indentDepth, currentString);
                indentDepth++;
            } else {
                if (currentString.indexOf('}') > -1) {
                    indentDepth--;
                }
                currentString = this.getStringWithIndents(indentDepth, currentString);
            }
            formattedContent.push(currentString);
        }

        return formattedContent.join('\n');
    }


    removeIndents(content) {
        return content.replace(new RegExp(this.allIndentsRegexpCode, 'gm'), '');
    }

    getStringWithIndents(indentDepth, string) {
        return new Array(indentDepth * this.indentLength).join(' ') + string;
    }

    removeExcessLines(content) {
        return content.replace(new RegExp(this.excessLineRegexpCode, 'gi'), '\n');
    }

    removeExcessLinesInOperators(content) {
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
                    formattedContent += currentString + '\n';
                }
            }
        }

        return formattedContent;
    }

    removeAllOperatorsByName(content, name) {
        var operatorStartIndex = 0;
        var processContent = content;
        var operatorRegexp = new RegExp(name + '\\s*{', 'gi');

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
                    $.notify(
                        '<strong>SPARQL syntax error, check brackets nesting.</strong><br>',
                        {
                            type: 'warning',
                            placement: {
                                from: 'bottom',
                                align: 'right'
                            }
                        }
                    );
                    break;
                }
            }
        } while (operatorStartIndex >= 0);

        return this.beautify(processContent);
    }

    expandUri(content, prefixes) {
        Object.keys(prefixes).map(function(prefix) {
            var url = prefixes[prefix];
            var replacedContent = content.replace(new RegExp(prefix + ':(\\w+)', 'gi'), function(match, property) {
                return '<' + url + property + '>';
            });
            replacedContent ? content = replacedContent : false;
        });

        return content;
    }

    compactUri(content, prefixes) {
        Object.keys(prefixes).map(function(prefix) {
            var url = prefixes[prefix];
            var replacedContent = content.replace(new RegExp('\<' + url + '(\\w+)\>', 'gi'), function(match, property) {
                return prefix + '\:' + property;
            });
            replacedContent ? content = replacedContent : false;
        });

        return content;
    }

    removeSingletonProperties(content, saveVariablesReplacement) {
        var singletonProperty = 'singletonPropertyOf';
        var triplePairsRegexp = new RegExp(this.triplePairsRegexpCode, 'gi');
        var triplePairLinesRegexp = new RegExp(this.tripleLineRegexpCode, 'gi');
        var triplePairElementsRegexp = new RegExp(this.tripleElementsRegexpCode, 'gi');

        var deletedUri = [];
        var replacedVariables = [];

        var result = content.replace(triplePairsRegexp, function(triplePair) {
            // Don't replace triple pair, if there is no singleton property
            if (triplePair.indexOf(singletonProperty) === -1) {
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
            if (triplePairElements[1].charAt(0) !== '?' && triplePairElements[1].charAt(0) !== '&') {
                deletedUri.push(triplePairElements[1]);
            }

            // If saveVariablesReplacement is true
            if (saveVariablesReplacement) {
                replacedVariables.push({
                    variable: triplePairElements[1],
                    predicate: triplePairElements[5]
                });
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
            result: this.beautify(result),
            deleted_uri: deletedUri,
            replaced_variables: replacedVariables
        };
    }

    addSingletonProperties(content) {
        var tripleLineRegexp = new RegExp(this.tripleLineRegexpCode, 'gi');
        var tripleElementsRegexp = new RegExp(this.tripleElementsRegexpCode, 'gi');
        var singletonPropertyNumber = 0;
        var replaceStartPosition = content.search('WHERE');
        var formatter = this;

        var result = content.replace(tripleLineRegexp, function(triple, offset) {
            if (offset < replaceStartPosition) {
                return triple;
            }

            singletonPropertyNumber++;
            var singletonProperty = '?sp_' + singletonPropertyNumber;

            // Get triple elements
            var triplePairElements = triple.match(tripleElementsRegexp);

            // Build triple with singleton property
            return triplePairElements[0] + ' ' + singletonProperty + ' ' + triplePairElements[2] + '.\r\n' +
                singletonProperty + ' ' + formatter.singletonPropertyUri + ' ' + triplePairElements[1] + '.\r\n';
        });

        return this.beautify(result);
    }

    getUndefinedVariables(content) {
        //TODO: this algorithm isn't consider nested SELECT/WHERE pairs

        var contentLines = content.split('\n');

        var lineCount = contentLines.length;
        var whereClauseRegexp = new RegExp('where', 'i');
        var whereClauseFound = false;
        var inWhereClause = false;
        var inWhereCounter = false;
        var allVariables = [];
        var whereVariables = [];
        var lineVariablesRegexp = new RegExp(this.variablesRegexpCode, 'g');

        for (var i = 0; i < lineCount; i++) {
            var currentString = contentLines[i];

            if (whereClauseFound === false) {
                if (whereClauseRegexp.test(currentString)) {
                    whereClauseFound = true;
                }
            }
            if (whereClauseFound) {
                currentString.indexOf('{') > -1 ? inWhereCounter++ : false;
                currentString.indexOf('}') > -1 ? inWhereCounter-- : false;
                if (inWhereCounter !== false) {
                    inWhereClause = true;
                }
            }

            var lineVariables;
            while (lineVariables = lineVariablesRegexp.exec(currentString)) {
                var variable = {
                    variable: lineVariables[0],
                    line: i,
                    startIndex: lineVariables.index,
                    endIndex: lineVariablesRegexp.lastIndex
                };
                allVariables.push(variable);
                if (inWhereClause) {
                    whereVariables.push(variable);
                }
            }

            if (inWhereCounter === 0) {
                whereClauseFound = false;
                inWhereClause = false;
            }
        }

        allVariables = _.uniqBy(allVariables, 'variable');
        whereVariables = _.uniqBy(whereVariables, 'variable');

        return _.differenceBy(allVariables, whereVariables, 'variable');
    }

    getAllPredicatesAndObjects(content) {
        var predicatesAndObjects = [];
        var excessWhitespacesRegexp = new RegExp('[\\s\.]*$', 'gm');
        var tripleLines = content.match(new RegExp(this.tripleLineRegexpCode, 'g'));

        if (tripleLines) {
            var triples = tripleLines.map(function(triple) {
                return triple.replace(excessWhitespacesRegexp, '');
            });

            triples.forEach(function(triple) {
                var tripleParts = triple.split(/\s/g);
                predicatesAndObjects.push(tripleParts[1]);
                predicatesAndObjects.push(tripleParts[2]);
            });
        }

        return _.uniq(predicatesAndObjects);
    }
}
