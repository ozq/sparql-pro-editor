/**
 * SparqlFormatter
 *
 * Class contains helper-methods for sparql query modifying
 */
class SparqlFormatter {
    /**
     * @param options
     */
    constructor(options) {
        this.triplePairsRegexpCode = '(?:(([?<$\\w][\\w:\\/\\.\\-#>]+)[\\s\\.]+){3}){2}';
        this.uriRegexpCode = '[\\w]*[?<$:][\\w:\\/\\.\\-#>]+';
        this.tripleLineRegexpCode = '(?:(?:' + this.uriRegexpCode + ')[\\s\\.]*){3}';
        this.tripleElementsRegexpCode = '[?<$\\w:][\\w:\\/\\.\\-#>]*[?!\\w>]';
        this.singletonPropertyUri = '\<http://www.w3.org/1999/02/22-rdf-syntax-ns#singletonPropertyOf>';
        this.allPrefixesRegexpCode = '[\\w]+(?=:(?!\\/\\/))';
        this.excessLineRegexpCode = '(\\n\\s*){2}[^\\S\\t]';
        this.allIndentsRegexpCode = '^[\\t ]+(?![\\n])(?=[\\S])';
        this.variablesRegexpCode = '[?$]\\w+';
        this.rdfTypeUri = '(<http:\\/\\/www\\.w3\\.org\\/1999\\/02\\/22-rdf-syntax-ns#type>|rdf:type)';
        this.labelUri = '^(<http:\\/\\/www\\.w3\\.org\\/2000\\/01\\/rdf-schema#label>|rdfs:label)$';
        this.wrgTripleRegexpCode = this.uriRegexpCode + '\\s+' + this.uriRegexpCode + '_wrg' + '\\s+' + this.uriRegexpCode;
        this.tripleElementRegexpCode = '^\\s*([?<$\\w][\\w:\\/\\.\\-#>]+)\\s*$';
        this.allUriRegexpCode = '[\\w<]+\\:[\\w#\\/\\.-\ v\>-]+';
        this.indentLength = options && options.indentLength ? options.indentLength : 4;
        this.additionalPrefixes = options && options.additionalPrefixes ? options.additionalPrefixes : {};
    }

    /**
     * @param content
     * @returns {*}
     */
    beautify(content) {
        return this.correctBrackets(
            this.removeExcessLinesInOperators(
                this.removeExcessLines(
                    this.removeIndents(content)
                )
            )
        );
    }

    /**
     * @param query
     * @returns {string}
     */
    correctBrackets(query) {
        let queryLines = query.split('\n');
        let indentDepth = 0;
        let formattedQueryLines = [];

        for (let i = 0; i < queryLines.length; i++) {
            let queryLine = queryLines[i];
            if (queryLine.indexOf('{') > -1) {
                queryLine = this.buildStringWithIndents(queryLine, indentDepth);
                indentDepth++;
            } else {
                if (queryLine.indexOf('}') > -1) {
                    indentDepth--;
                }
                queryLine = this.buildStringWithIndents(queryLine, indentDepth);
            }
            formattedQueryLines.push(queryLine);
        }

        return formattedQueryLines.join('\n');
    }

    /**
     * @param query
     */
    removeIndents(query) {
        return query.replace(new RegExp(this.allIndentsRegexpCode, 'gm'), '');
    }

    /**
     * @param indentDepth
     * @param string
     * @returns {string}
     */
    buildStringWithIndents(string, indentDepth) {
        return new Array(indentDepth * this.indentLength).join(' ') + string;
    }

    /**
     * @param query
     * @returns {string}
     */
    removeExcessLines(query) {
        return _.compact(query.replace(new RegExp(this.excessLineRegexpCode, 'gi'), '\n').split('\n')).join('\n');
    }

    /**
     * @param query
     * @returns {Array}
     */
    removeExcessLinesInOperators(query) {
        let queryLines = query.split('\n');
        let indentDepth = 0;
        let formattedContent = [];
        let emptyLineRegexp = new RegExp('^\\s+$', 'gm');
        let operatorContainsRegexp = new RegExp('\\s*\\w+\\s*{', 'gm');

        for (let i = 0; i < queryLines.length; i++) {
            let queryLine = queryLines[i];

            queryLine.indexOf('{') > -1 ? indentDepth++ : false;
            queryLine.indexOf('}') > -1 ? indentDepth-- : false;

            if (indentDepth >= 0) {
                let isCurrentLineEmpty = queryLine.replace(/^\s+|\s+$/g, '') === '' || emptyLineRegexp.test(queryLine);
                let nextQueryLine = queryLines[i + 1];
                if (!(isCurrentLineEmpty && operatorContainsRegexp.test(nextQueryLine) === false)) {
                    formattedContent += queryLine + '\n';
                }
            }
        }

        return formattedContent;
    }

    /**
     * @param query
     * @param operator
     * @returns {*}
     */
    removeAllOperatorsByName(query, operator) {
        let operatorStartIndex = 0;

        do {
            // Find operator start index
            operatorStartIndex = query.search(this.getOperatorRegexp(operator));
            if (operatorStartIndex >= 0) {
                let matchedBracket;
                let bracketsCounter = 0;
                let bracketsRegexp = new RegExp('[{}]', 'g');
                bracketsRegexp.lastIndex = operatorStartIndex;

                // Find operator last bracket index
                while (matchedBracket = bracketsRegexp.exec(query)) {
                    bracketsRegexp.lastIndex = matchedBracket.index + 1;
                    matchedBracket[0] === '{' ? bracketsCounter++ : false;
                    matchedBracket[0] === '}' ? bracketsCounter-- : false;
                    if (bracketsCounter === 0) {
                        // Replace all content from operator start index to operator last bracket index
                        let operatorContent = query.substring(operatorStartIndex, bracketsRegexp.lastIndex);
                        query = query.replace(operatorContent, '');
                        break;
                    }
                }

                // Handle brackets nesting error
                if (bracketsCounter > 0) {
                    console.warn('SPARQL syntax error, check brackets nesting!');
                    break;
                }
            }
        } while (operatorStartIndex >= 0);

        return this.beautify(query);
    }

    /**
     * @param query
     * @param prefixes
     * @returns {*}
     */
    expandUri(query, prefixes = {}) {
        prefixes = _.merge(this.additionalPrefixes, prefixes);
        Object.keys(prefixes).map(function(prefix) {
            let uri = prefixes[prefix];
            let expandedQuery = query.replace(new RegExp(prefix + ':(\\w+)', 'gi'), function(match, property) {
                return '<' + uri + property + '>';
            });
            expandedQuery ? query = expandedQuery : false;
        });

        return query;
    }

    /**
     * @param query
     * @param prefixes
     * @param isStrict
     * @returns {*}
     */
    compactUri(query, prefixes = {}, isStrict = true) {
        prefixes = _.merge(this.additionalPrefixes, prefixes);
        Object.keys(prefixes).map(function(prefix) {
            let compactedQuery = null;
            let uri = prefixes[prefix];
            let regExp = isStrict === true ?
                new RegExp('\<' + uri + '(\\w+)\>', 'gi') :
                new RegExp(uri + '(\\w+)', 'gi');

            if (query) {
                compactedQuery = query.replace(regExp, function(match, property) {
                    return prefix + '\:' + property;
                });
            }

            compactedQuery ? query = compactedQuery : false;
        });

        return query;
    }

    /**
     * @param query
     * @param saveReplacedVariables
     * @returns {{result: *, deleted_uri: Array, replaced_variables: Array}}
     */
    removeSingletonProperties(query, saveReplacedVariables = false) {
        let self = this;
        let singletonProperty = 'singletonPropertyOf';
        let triplePairsRegexp = new RegExp(this.triplePairsRegexpCode, 'gi');
        let triplePairLinesRegexp = new RegExp(this.tripleLineRegexpCode, 'gi');
        let triplePairElementsRegexp = new RegExp(this.tripleElementsRegexpCode, 'gi');

        let deletedUri = [];
        let replacedVariables = [];

        let result = query.replace(triplePairsRegexp, function(triplePair) {
            // Don't replace triple pair, if there is no singleton property
            if (triplePair.indexOf(singletonProperty) === -1) {
                return triplePair;
            }

            // Get triple pair lines
            let triplePairLines = triplePair.match(triplePairLinesRegexp);

            // Group triple pair lines
            let groupedTriplePair = triplePairLines[0].indexOf(singletonProperty) !== -1 ?
                triplePairLines[1] + triplePairLines[0] :
                triplePairLines[0] + triplePairLines[1];

            // Get triple pair elements
            let triplePairElements = groupedTriplePair.match(triplePairElementsRegexp).map(function(element) {
                return element.replace(/\.$/, '');
            });

            // Save predicate, if it's not a variable
            if (self.isVariable(triplePairElements[1]) === false) {
                deletedUri.push(triplePairElements[1]);
            }

            // Save replaced variables, if it necessary
            if (saveReplacedVariables) {
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

    /**
     * @param query
     * @param rebuild
     * @param spPostfix
     * @param spPrefix
     * @returns {*}
     */
    addSingletonProperties(query, rebuild = false, spPostfix = '', spPrefix = 'sp_') {
        if (rebuild === true) {
            query = sparqlFormatter.removeSingletonProperties(query).result;
        }

        let self = this;
        let tripleLineRegexp = new RegExp(this.tripleLineRegexpCode, 'gi');
        let tripleElementsRegexp = new RegExp(this.tripleElementsRegexpCode, 'gi');
        let singletonPropertyNumber = 0;
        let replaceStartPosition = query.search(this.getOperatorRegexp('where'));

        let result = query.replace(tripleLineRegexp, function(triple, offset) {
            if (offset < replaceStartPosition) {
                return triple;
            }

            singletonPropertyNumber++;
            let singletonProperty = '?' + spPrefix + singletonPropertyNumber + spPostfix;

            // Get triple elements
            let triplePairElements = triple.match(tripleElementsRegexp);

            // Build triple with singleton property
            return triplePairElements[0] + ' ' + singletonProperty + ' ' + triplePairElements[2] + '.\r\n' +
                singletonProperty + ' ' + self.singletonPropertyUri + ' ' + triplePairElements[1] + '.\r\n';
        });

        return this.beautify(result);
    }

    /**
     * @param operator
     * @returns {RegExp}
     */
    getOperatorRegexp(operator) {
        return new RegExp(operator + '\\s*{', 'gi');
    }

    /**
     * @param query
     */
    getSelectVariables(query) {
        let result = query.match(new RegExp('^\\s*select(.*)(\\s+where)', 'mi'));
        if (result) {
            result.items = _.compact(result[1].split(' '));
        }
        return result;
    }

    /**
     * @param query
     */
    getUndefinedVariables(query) {
        let queryLines = query.split('\n');
        let whereClauseRegexp = new RegExp('where', 'i');
        let whereClauseFound = false;
        let inWhereClause = false;
        let inWhereCounter = false;
        let allVariables = [];
        let whereVariables = [];
        let lineVariablesRegexp = new RegExp(this.variablesRegexpCode, 'g');

        for (let i = 0; i < queryLines.length; i++) {
            let currentString = queryLines[i];

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

            let lineVariables;
            while (lineVariables = lineVariablesRegexp.exec(currentString)) {
                let variable = {
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

    /**
     * @param query
     */
    getAllTriples(query) {
        let self = this;
        let triples = query.match(new RegExp(this.tripleLineRegexpCode, 'gmi'));
        if (triples) {
            return triples.map(function(triple) {
                return self.removeExcessWhitespaces(triple);
            });
        }

        return triples;
    }

    /**
     * @param line
     * @param isStrict
     * @returns {boolean}
     */
    isTripleLine(line, isStrict = false) {
        let regexp = isStrict ? '^\\s*' + this.tripleLineRegexpCode + '$' : this.tripleLineRegexpCode;
        return (new RegExp(regexp, 'gmi')).test(line);
    }

    /**
     * @param query
     * @returns {{subjects: Array, predicates: Array, objects: Array}}
     */
    getGroupedTripleData(query) {
        let self = this;
        let groupedTripleData = {
            'subjects': [],
            'predicates': [],
            'objects': [],
        };

        let triples = this.getAllTriples(query);
        if (triples) {
            triples.forEach(function(triple) {
                let tripleParts = self.getTripleParts(triple);
                if (_.includes(groupedTripleData.subjects, tripleParts[0])) { groupedTripleData.subjects.push(tripleParts[0]) }
                if (_.includes(groupedTripleData.predicates, tripleParts[0])) { groupedTripleData.predicates.push(tripleParts[1]) }
                if (_.includes(groupedTripleData.objects, tripleParts[0])) { groupedTripleData.objects.push(tripleParts[2]) }
            });
        }

        return groupedTripleData;
    }

    /**
     * @param query
     * @returns {*}
     */
    replaceEmptyOperators(query) {
        let cleanedQuery = query.replace(new RegExp('\\s*\\w+\\s*{\\s*}', 'gmi'), function () {
            return '';
        });
        if (cleanedQuery === query) {
            return cleanedQuery;
        } else {
            return this.replaceEmptyOperators(cleanedQuery);
        }
    }

    /**
     * @param value
     * @returns {boolean}
     */
    isVariable(value) {
        return (new RegExp(this.variablesRegexpCode, 'i')).test(value);
    }

    /**
     * @param line
     */
    getFirstVariable(line) {
        return line.match(new RegExp('(\\?\\w+)', 'i'))[1];
    }

    /**
     * @param query
     */
    removeExcessWhitespaces(query) {
        return query.replace(new RegExp('[\\s\.]*$', 'gm'), '');
    }

    /**
     * @param triple
     * @returns {Array|*}
     */
    getTripleParts(triple) {
        let tripleParts = triple.split(/\s/g).map(function(triplePart) {
            return _.trim(triplePart, '\'\.\(\)');
        });
        return _.compact(tripleParts);
    }

    /**
     * @param value
     * @returns {boolean}
     */
    isRdfTypeUri(value) {
        return (new RegExp(this.rdfTypeUri, 'i')).test(value);
    }

    /**
     * @param value
     * @returns {boolean}
     */
    isLabelUri(value) {
        return (new RegExp(this.labelUri, 'i')).test(value);
    }

    /**
     * @param query
     * @param subject
     * @param predicatesChain
     * @param rootClass
     * @returns {{rootClass: *, predicatesChain: *}}
     */
    buildPredicatesChain(query, subject, predicatesChain = [], rootClass = null) {
        if (_.isString(rootClass)) {
            return {
                'rootClass': rootClass,
                'predicatesChain': _.reverse(predicatesChain)
            };
        }

        let firstFoundedLine = _.trim(query.match(new RegExp('^\\s*\\?' + subject + '.*', 'mi'))[0]);
        let foundedTripleParts = this.getTripleParts(firstFoundedLine);
        let lineSubject = foundedTripleParts[0];
        let linePredicate = foundedTripleParts[1];
        let lineObject = _.trimEnd(foundedTripleParts[2], '.');

        if (this.isVariable(linePredicate) ) {
            let getObjectBySubjectRegexp = new RegExp('^\\s*\\' + linePredicate + '\\s+\\S+\\s+([\\S]+)', 'gm');
            let match = getObjectBySubjectRegexp.exec(query);
            linePredicate = _.trimEnd(match[1], '.');
        }
        if (subject === lineSubject) {
            if (this.isRdfTypeUri(linePredicate)) {
                return this.buildPredicatesChain(query, lineSubject, predicatesChain, lineObject);
            } else {
                console.warn('Wrong sparql syntax...');
            }
        }
        if (subject === lineObject) {
            predicatesChain.push(linePredicate);
            return this.buildPredicatesChain(query, lineSubject, predicatesChain);
        }
    }

    /**
     * @param chainData
     * @returns {string}
     */
    buildQueryByPredicatesChain(chainData) {
        let query = '';
        let currentObject = chainData.rootClass;

        _.forEach(chainData.predicatesChain, function(predicate, i) {
            currentObject = '?class_' + i;
            let currentRestriction = '?restriction_' + i;
            let previousKey = i - 1;
            let previousClass = i === 0 ? chainData.rootClass : '?class_' + previousKey;
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
