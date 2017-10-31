class SparqlFormatter {
    constructor(options) {
        //TODO: check regexp, they may be not "clear" (match excess whitespaces and dots)
        this.triplePairsRegexpCode = '(?:(([?<$\\w][\\w:\\/\\.\\-#>]+)[\\s\\.]+){3}){2}';
        this.tripleLineRegexpCode = '(?:(?:[\\w]*[?<$:][\\w:\\/\\.\\-#>]+)[\\s\\.]+){3}';
        this.tripleElementsRegexpCode = '[?<$\\w:][\\w:\\/\\.\\-#>]*[?!\\w>]';
        this.allUriRegexpCode = '[\\w<]+\\:[\\w#\\/\\.-\ v\>-]+';
        this.singletonPropertyUri = '\<http://www.w3.org/1999/02/22-rdf-syntax-ns#singletonPropertyOf>';
        this.allPrefixesRegexpCode = '[\\w]+(?=:(?!\\/\\/))';
        this.excessLineRegexpCode = '(\\n\\s*){2}[^\\S\\t]';
        this.allIndentsRegexpCode = '^[\\t ]+(?![\\n])(?=[\\S])';
        this.variablesRegexpCode = '[?$]\\w+';
        this.rdfTypeUri = '(<http:\\/\\/www\\.w3\\.org\\/1999\\/02\\/22-rdf-syntax-ns#type>|rdf:type)';
        this.tripleElementRegexpCode = '^\\s*([?<$\\w][\\w:\\/\\.\\-#>]+)\\s*$';

        this.indentLength = options && options.indentLength ? options.indentLength : 4;
        this.additionalPrefixes = options && options.additionalPrefixes ? options.additionalPrefixes : {};
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

    compactUri(content, prefixes = {}, isStrict = true) {
        prefixes = _.merge(this.additionalPrefixes, prefixes);
        Object.keys(prefixes).map(function(prefix) {
            var url = prefixes[prefix];
            var regExp = isStrict === true ?
                new RegExp('\<' + url + '(\\w+)\>', 'gi') :
                new RegExp(url + '(\\w+)', 'gi');

            var replacedContent = content.replace(regExp, function(match, property) {
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

    addSingletonProperties(content, rebuild = false, spPostfix = '', spPrefix = 'sp_') {
        if (rebuild === true) {
            content = sparqlFormatter.removeSingletonProperties(content).result;
        }
        var tripleLineRegexp = new RegExp(this.tripleLineRegexpCode, 'gi');
        var tripleElementsRegexp = new RegExp(this.tripleElementsRegexpCode, 'gi');
        var singletonPropertyNumber = 0;
        var replaceStartPosition = content.search('WHERE');
        var thisObject = this;

        var result = content.replace(tripleLineRegexp, function(triple, offset) {
            if (offset < replaceStartPosition) {
                return triple;
            }

            singletonPropertyNumber++;
            var singletonProperty = '?' + spPrefix + singletonPropertyNumber + spPostfix;

            // Get triple elements
            var triplePairElements = triple.match(tripleElementsRegexp);

            // Build triple with singleton property
            return triplePairElements[0] + ' ' + singletonProperty + ' ' + triplePairElements[2] + '.\r\n' +
                singletonProperty + ' ' + thisObject.singletonPropertyUri + ' ' + triplePairElements[1] + '.\r\n';
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
        var tripleLines = content.match(new RegExp(this.tripleLineRegexpCode, 'g'));

        if (tripleLines) {
            var self = this;
            var triples = tripleLines.map(function(triple) {
                return self.removeExcessWhitespaces(triple);
            });

            triples.forEach(function(triple) {
                var tripleParts = SparqlFormatter.getTripleParts(triple);
                predicatesAndObjects.push(tripleParts[1]);
                predicatesAndObjects.push(tripleParts[2]);
            });
        }

        return _.uniq(predicatesAndObjects);
    }

    /**
     * @param value
     * @returns {boolean}
     */
    isVariable(value) {
        var regexp = new RegExp(this.variablesRegexpCode, 'i');
        return regexp.test(value);
    }

    /**
     * @param content
     */
    getFirstVariable(content) {
        var regexp = new RegExp('(\\?\\w+)', 'i');
        return content.match(regexp)[1];
    }

    /**
     * @param content
     */
    removeExcessWhitespaces(content) {
        var regexp = new RegExp('[\\s\.]*$', 'gm');
        return content.replace(regexp, '');
    }

    /**
     * @param triple
     * @returns {Array|*}
     */
    static getTripleParts(triple) {
        return triple.split(/\s/g);
    }

    /**
     * @param uri
     * @returns {string}
     */
    static getPrefix(uri) {
        return _.split(uri, ':')[0] + ':';
    }

    /**
     * @param content
     * @param value
     */
    getFirstTripleByValue(content, value) {
        var regexp = new RegExp('^\\s*\\?' + value + '.*', 'mi');
        return content.match(regexp)[0];
    }

    /**
     * @param value
     * @returns {boolean}
     */
    isRdfTypeUri(value) {
        var regexp = new RegExp(this.rdfTypeUri, 'i');
        return regexp.test(value);
    }

    /**
     * @param content
     * @param subject
     * @param predicatesChain
     * @param rootClass
     * @returns {{rootClass: *, predicatesChain: *}}
     */
    buildPredicatesChain(content, subject, predicatesChain, rootClass) {
        if (_.isString(rootClass)) {
            return {
                'rootClass': rootClass,
                'predicatesChain': _.reverse(predicatesChain)
            };
        }

        var firstFoundedLine = _.trim(this.getFirstTripleByValue(content, subject));
        var foundedTripleParts = SparqlFormatter.getTripleParts(firstFoundedLine);
        var lineSubject = foundedTripleParts[0];
        var linePredicate = foundedTripleParts[1];
        var lineObject = _.trimEnd(foundedTripleParts[2], '.');

        if (this.isVariable(linePredicate) ) {
            var getObjectBySubjectRegexp = new RegExp('^\\s*\\' + linePredicate + '\\s+\\S+\\s+([\\S]+)', 'gm');
            var match = getObjectBySubjectRegexp.exec(content);
            linePredicate = _.trimEnd(match[1], '.');
        }
        if (subject === lineSubject) {
            if (this.isRdfTypeUri(linePredicate)) {
                return this.buildPredicatesChain(content, lineSubject, predicatesChain, lineObject);
            } else {
                console.log('Wrong sparql syntax...');
            }
        }
        if (subject === lineObject) {
            predicatesChain.push(linePredicate);
            return this.buildPredicatesChain(content, lineSubject, predicatesChain);
        }
    }

    buildQueryByPredicatesChain(chainData) {
        var query = '';
        var currentObject = chainData.rootClass;
        _.forEach(chainData.predicatesChain, function(predicate, i) {
            currentObject = '?class_' + i;
            var currentRestriction = '?restriction_' + i;
            var previousKey = i - 1;
            var previousClass = i === 0 ? chainData.rootClass : '?class_' + previousKey;
            query +=
                previousClass + ' crm2:restriction ' + currentRestriction + '.\n' +
                currentRestriction + ' owl:onProperty ' + predicate + '.\n' +
                currentRestriction + ' owl:allValuesFrom ' + currentObject + '.\n';
        });
        query += currentObject + ' crm2:restriction ?restriction_final.\n' +
            '?restriction_final rdfs:label ?label.\n' +
            '?restriction_final owl:onProperty ?property.\n';

        return 'SELECT ?label ?property WHERE { \n' + query + '\n}';
    }
}
