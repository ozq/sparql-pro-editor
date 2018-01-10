/**
 * WSparql
 * Class for transforming wsparq to sparql and back
 */
class WSparql {
    constructor() {
        this.sparqlFormatter = new SparqlFormatter();
        this.minusedVariablesRegexpCode = '-\\?\\w+';

        /**
         * Order of methods is important!
         * Some methods generates not clear sparql, but wsparql.
         * E.g., 'wearing' generates query with 'relation' calls, so, 'wearing' must be defined before 'relation'.
         */
        this.methods = {
            wearing: {
                toSparql: function (triple, postfix) {
                    let tripleParts = this.sparqlFormatter.getTripleParts(triple);
                    let relationPart = '';
                    let object = this.filterVariable(tripleParts[2]);
                    if (_.isUndefined(postfix)) {
                        relationPart = 'relation(' + object + ' crm2:object ' + object + 'Object' + ')\n';
                    } else {
                        relationPart = 'OPTIONAL {\n' +
                            'requiredRelation(' + object + ' crm2:object ' + object + 'Object' + ')\n' +
                            postfix + '\n}';
                    }
                    relationPart += 'relation(' + object + ' crm2:date_from ' + '?dateFrom' + ')\n';
                    relationPart += 'relation(' + object + ' crm2:date_to ' + '?dateTo' + ')\n';
                    let query = 'OPTIONAL {\n' + this.filterTriple(triple) + '\n' + relationPart + '\n}';
                    return {
                        query: query,
                        whereVariables: this.isMinusedVariable(tripleParts[2]) === false ? [tripleParts[2]] : []
                    }
                },
                toWsparql: function (query) {
                    let queryLines = _.compact(query.split('\n'));
                    let optionalPartRegexp = new RegExp('\s*optional', 'i');
                    let relationFunctionRegexpTemplate = '\\s*relation\\((' + self.sparqlFormatter.uriRegexpCode + ')\\s+' + '(.*' + '[#:]%predicate_postfix%' + ')' + '\\s' + self.sparqlFormatter.uriRegexpCode + '\\)';
                    let relationFunctionRegexpCode = '\\s*relation\\((' + self.sparqlFormatter.uriRegexpCode + ')\\s+' + self.sparqlFormatter.uriRegexpCode + '\\s' + self.sparqlFormatter.uriRegexpCode + '\\)';
                    let objectRelationRegexpCode = '\\s*requiredRelation\\((' + self.sparqlFormatter.uriRegexpCode + ')\\s+' + '(.*' + '[#:]object' + ')' + '\\s' + '(' + self.sparqlFormatter.uriRegexpCode + ')' + '\\)';
                    let wrgTripleRegexp = new RegExp(self.sparqlFormatter.wrgTripleRegexpCode, 'i');
                    let emptyLineRegexp = new RegExp('^[\\s}]+$');
                    let inOptionalCounter = false;
                    let inOptionalPart = false;
                    let optionalPartFound = false;
                    let wearingData = [];
                    let optionalPartStartLineNumber = false;
                    let hasSiblings = false;
                    let lastFilledItem = false;
                    let requiredRelationFound = false;

                    for (let i = 0; i < queryLines.length; i++) {
                        let line = _.trim(queryLines[i], '. ');
                        if (optionalPartRegexp.test(line)) {
                            optionalPartFound = true;
                            hasSiblings = false;
                            optionalPartStartLineNumber = i;
                            lastFilledItem = false;
                        } else {
                            if (wrgTripleRegexp.test(line)) {
                                let tripleParts = this.sparqlFormatter.getTripleParts(line);
                                lastFilledItem = {
                                    triple: _.trim(line, '. '),
                                    subject: _.trim(tripleParts[0], '. '),
                                    predicate: _.trim(tripleParts[1], '. '),
                                    object: _.trim(tripleParts[2], '. '),
                                    records: { object: '', date_from: '', date_to: '' },
                                    lines: [i],
                                    hasSiblings: hasSiblings,
                                    optionalPartStartLineNumber: optionalPartStartLineNumber,
                                    optionalPartFinishLineNumber: null,
                                    postfixData: {}
                                };
                                wearingData.push(lastFilledItem);
                            } else {
                                let relationFunctionFound = false;

                                let requiredObjectRelationMatch = line.match(new RegExp(objectRelationRegexpCode, 'i'));
                                if (requiredObjectRelationMatch) {
                                    let relationSubject = requiredObjectRelationMatch[1];
                                    let relationObject = requiredObjectRelationMatch[3];
                                    let wearingDataItem = _.find(wearingData, function (data) { return data.object === relationSubject; });
                                    if (wearingDataItem) {
                                        requiredRelationFound = true;
                                        relationFunctionFound = true;
                                        wearingDataItem.postfixData = {
                                            triple: null,
                                            object: relationObject,
                                            hasSiblings: hasSiblings,
                                            optionalPartStartLineNumber: optionalPartStartLineNumber,
                                            optionalPartFinishLineNumber: null,
                                        };
                                        wearingDataItem.records.object = _.trim(line, '. ');
                                        wearingDataItem.lines.push(i);
                                        lastFilledItem = wearingDataItem;
                                    }
                                } else {
                                    _.forEach(['object', 'date_from', 'date_to'], function (postfix) {
                                        let regexpCode = relationFunctionRegexpTemplate.replace('%predicate_postfix%', postfix);
                                        let relationFunctionMatch = line.match(new RegExp(regexpCode, 'i'));
                                        if (relationFunctionMatch) {
                                            let relationSubject = relationFunctionMatch[1];
                                            let wearingDataItem = _.find(wearingData, function (data) { return data.object === relationSubject; });
                                            if (wearingDataItem) {
                                                wearingDataItem.records[postfix] = _.trim(line, '. ');
                                                wearingDataItem.lines.push(i);
                                                lastFilledItem = wearingDataItem;
                                            }
                                            relationFunctionFound = true;
                                        }
                                    });
                                    if (relationFunctionFound === false) {
                                        let relationFunctionMatch = line.match(new RegExp(relationFunctionRegexpCode, 'i'));
                                        if (relationFunctionMatch) {
                                            let relationSubject = relationFunctionMatch[1];
                                            let wearingDataItem = _.find(wearingData, function (data) { return data.postfixData && data.postfixData.object === relationSubject; });
                                            if (wearingDataItem) {
                                                wearingDataItem.postfixData.triple = _.trim(line, '. ');
                                                wearingDataItem.postfixData.hasSiblings = hasSiblings;
                                                wearingDataItem.lines.push(i);
                                                lastFilledItem = wearingDataItem;
                                            }
                                            relationFunctionFound = true;
                                        }
                                    }
                                }

                                if (relationFunctionFound === false && (emptyLineRegexp.test(line) === false && line !== '')) {
                                    hasSiblings = true;
                                    lastFilledItem = false;
                                }
                            }
                        }

                        if (optionalPartFound) {
                            if (line.indexOf('{') > -1) {
                                inOptionalCounter++;
                            }
                            if (line.indexOf('}') > -1) {
                                inOptionalCounter--;
                                if (lastFilledItem !== false) {
                                    if (requiredRelationFound === true) {
                                        lastFilledItem.postfixData.optionalPartFinishLineNumber = i;
                                        lastFilledItem.postfixData.hasSiblings = hasSiblings;
                                    } else {
                                        lastFilledItem.hasSiblings = hasSiblings;
                                        lastFilledItem.optionalPartFinishLineNumber = i;
                                    }
                                }
                                requiredRelationFound = false;
                            }
                            if (inOptionalCounter !== false) {
                                inOptionalPart = true;
                            }
                        }
                        if (inOptionalPart === true && inOptionalCounter === 0) {
                            hasSiblings = false;
                            inOptionalPart = false;
                            inOptionalCounter = false;
                        }
                    }

                    let selectVariables = [];
                    if (wearingData) {
                        _.forEach(wearingData, function(wearingItem) {
                            let isValid = true;
                            _.forEach(wearingItem.records, function(record) {
                                if (record === '') {
                                    isValid = false;
                                }
                            });
                            if (isValid === true) {
                                let inputLineNumber = _.min(wearingItem.lines);
                                selectVariables.push(wearingItem.subject);
                                _.forEach(wearingItem.lines, function(lineNumber) {
                                    queryLines[lineNumber] = '';
                                });
                                let postfix = wearingItem.postfixData && wearingItem.postfixData.triple ? wearingItem.postfixData.triple : '';
                                let data = _.compact([wearingItem.triple, postfix]);
                                queryLines[inputLineNumber] = 'wearing(' + data.join(', ') + ')';
                                if (wearingItem.hasSiblings === false) {
                                    if (wearingItem.optionalPartStartLineNumber && wearingItem.optionalPartFinishLineNumber) {
                                        queryLines[wearingItem.optionalPartStartLineNumber] = '';
                                        queryLines[wearingItem.optionalPartFinishLineNumber] = '';
                                    }
                                }
                                if (wearingItem.postfixData && wearingItem.postfixData.optionalPartStartLineNumber && wearingItem.postfixData.optionalPartFinishLineNumber) {
                                    queryLines[wearingItem.postfixData.optionalPartStartLineNumber] = '';
                                    queryLines[wearingItem.postfixData.optionalPartFinishLineNumber] = '';
                                }
                            }
                        });

                        query = queryLines.join('\n');
                    }

                    return {
                        query: query,
                        whereVariables: _.uniq(selectVariables)
                    };
                }
            },
            requiredRelation: {
                toSparql: function (triple, labelDepth = 1) {
                    labelDepth = _.toInteger(labelDepth);
                    let tripleParts = this.sparqlFormatter.getTripleParts(triple);
                    let labelPlaceholder = '%labelPlaceholder%';
                    let subject = this.filterVariable(tripleParts[2]);
                    let objectLabel = this.toLabelVariable(subject);
                    let labelQueryPart = labelPlaceholder;
                    let currentLabelQueryPart = '';
                    for (let i = 1; i <= labelDepth; i++) {
                        let object = i === labelDepth ? objectLabel : subject + '_label_' + i;
                        let currentLabelPlaceholder = i === labelDepth ? '' : labelPlaceholder;
                        currentLabelQueryPart = 'OPTIONAL {\n' + subject + ' rdfs:label ' + object + '.\n' + currentLabelPlaceholder + '\n}';
                        labelQueryPart = _.replace(labelQueryPart, labelPlaceholder, currentLabelQueryPart);
                        subject = object;
                    }
                    let query = this.filterTriple(triple) + '\n' + labelQueryPart;

                    return {
                        query: query,
                        whereVariables: this.isMinusedVariable(tripleParts[2]) === false ? [tripleParts[2], objectLabel] : []
                    }
                },
                toWsparql: function (query) {
                    query = query.replace(new RegExp('\\s*optional\\s*{\\s*requiredRelation\\((.*)\\)\\s*}', 'gmi'), function (match, triple) {
                        return '\nrelation(' + triple + ')';
                    });
                    return {
                        query: query,
                        whereVariables: _.uniq([])
                    };
                }
            },
            relation: {
                toSparql: function (triple, labelDepth = 1) {
                    let requiredRelationResult = this.methods.requiredRelation.toSparql.call(this, triple, labelDepth);
                    let query = 'OPTIONAL {\n' + requiredRelationResult.query + '\n}';
                    return {
                        query: query,
                        whereVariables: requiredRelationResult.whereVariables
                    }
                },
                toWsparql: function (query) {
                    let self = this;
                    let lines = _.compact(query.split('\n'));
                    let lineCount = lines.length;
                    let optionalPartRegexp = new RegExp('\s*optional', 'i');
                    let tripleData = [];
                    let inRootOptionalPart = false;
                    let inRootOptionalPartCounter = 0;
                    let whereClauseRegexp = new RegExp('where\\s*\\{', 'i');
                    let whereClauseFound = false;

                    for (let i = 0; i < lineCount; i++) {
                        let line = _.trim(lines[i], '. ');
                        if (whereClauseRegexp.test(line)) {
                            whereClauseFound = true;
                        } else {
                            if (whereClauseFound === true) {
                                if (self.sparqlFormatter.isTripleLine(line)) {
                                    let tripleParts = self.sparqlFormatter.getTripleParts(line);
                                    if (self.sparqlFormatter.isLabelUri(tripleParts[1])) {
                                        let labelObject = {
                                            triple: line,
                                            line: i,
                                            optionalDepth: inRootOptionalPartCounter,
                                            object: tripleParts[2],
                                            subject: tripleParts[0],
                                        };
                                        let tripleDataItem = _.find(tripleData, function (data) { return data.object === tripleParts[0]; });
                                        if (tripleDataItem) {
                                            let tripleBySubject = _.find(tripleData, function (data) { return data.subject === tripleParts[0]; });
                                            // prevent problem with reversed triples
                                            if (!tripleBySubject) {
                                                tripleDataItem.labels.push(labelObject);
                                            }
                                        } else {
                                            let tripleDataItem = _.find(tripleData, function (data) { return _.isEmpty(data.labels) === false && _.last(data.labels).object === tripleParts[0]; });
                                            if (tripleDataItem) {
                                                tripleDataItem.labels.push(labelObject);
                                            }
                                        }
                                    } else {
                                        tripleData.push({
                                            object: tripleParts[2],
                                            subject: tripleParts[0],
                                            optionalDepth: inRootOptionalPartCounter,
                                            triple: line,
                                            line: i,
                                            labels: []
                                        });
                                    }
                                } else {
                                    if (optionalPartRegexp.test(line)) {
                                        inRootOptionalPart = true;
                                    }
                                }

                                if (line.indexOf('{') > -1) {
                                    if (inRootOptionalPart) {
                                        inRootOptionalPartCounter++;
                                    }
                                }
                                if (line.indexOf('}') > -1) {
                                    if (inRootOptionalPart) {
                                        inRootOptionalPartCounter--;
                                        if (inRootOptionalPartCounter === 0) {
                                            inRootOptionalPart = false;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    let selectVariables = [];
                    _.forEach(_.uniq(tripleData), function(tripleItem) {
                        if (_.isEmpty(tripleItem.labels) === false) {
                            let labelDepth = _.size(tripleItem.labels);
                            lines[tripleItem.line] = '';
                            _.forEach(_.uniq(tripleItem.labels), function(labelItem) {
                                lines[labelItem.line] = '';
                            });
                            let functionArgs = [];
                            functionArgs.push(tripleItem.triple);
                            if (labelDepth > 1) {
                                functionArgs.push(labelDepth);
                            }
                            lines[tripleItem.line] = 'requiredRelation(' + functionArgs.join(', ') + ')';
                            selectVariables.push(tripleItem.object);
                        }
                    });

                    query = self.simplifyRelations(
                        self.methods.requiredRelation.toWsparql(
                            self.sparqlFormatter.replaceEmptyOperators(lines.join('\n'))
                        ).query
                    );

                    return {
                        query: query,
                        whereVariables: _.uniq(selectVariables)
                    }
                }
            },
            optional: {
                toSparql: function (triple) {
                    let query = 'OPTIONAL {\n' + triple + '\n}';
                    return {
                        query: query,
                        whereVariables: [this.sparqlFormatter.getTripleParts(triple)[2]]
                    }
                }
            }
        };
    }

    /**
     * @param query
     * @returns {string|*}
     */
    simplifyRelations(query) {
        let queryLines = query.split('\n');
        let objectData = [];
        let optionalDepth = 0;
        let inOptionalPart = false;
        let optionalRegexp = new RegExp('optional\\s*{', 'i');
        let somePartRegexp = new RegExp('\\w+\\s*{', 'i');
        let requiredRelationRegexp = new RegExp('requiredRelation\\((.+)\\)', 'i');
        for (let i = 0; i < queryLines.length; i++) {
            let queryLine = queryLines[i];
            if (optionalRegexp.test(queryLine)) {
                inOptionalPart = true;
            } else {
                if (somePartRegexp.test(queryLine) === true) {
                    inOptionalPart = false;
                }
            }
            if (inOptionalPart) {
                queryLine.indexOf('{') > -1 ? optionalDepth++ : false;
                queryLine.indexOf('}') > -1 ? optionalDepth-- : false;
                if (optionalDepth === 0) {
                    inOptionalPart = false;
                }
            }
            if (self.sparqlFormatter.isTripleLine(queryLine)) {
                objectData[self.sparqlFormatter.getTripleParts(queryLine)[2]] = {
                    optionalDepth: optionalDepth,
                    lineNumber: i
                };
            }
            if (requiredRelationRegexp.test(queryLine)) {
                let relationContent = queryLine.match(requiredRelationRegexp)[1];
                let relationTriple = relationContent.split(', ')[0];
                let relationSubjectData = objectData[self.sparqlFormatter.getTripleParts(relationTriple)[0]];
                if (optionalDepth !== relationSubjectData.optionalDepth) {
                    queryLines[i] = '';
                    let newRelation = 'relation(' + relationContent + ')';
                    queryLines.splice(relationSubjectData.lineNumber + 1, 0, newRelation);
                }
            }
        }

        query = queryLines.join('\n');

        let complexRelationRegexp = new RegExp('optional\\s*{\\s*(relation\\(.+\\))\\s+\\}', 'gi');
        while (complexRelationRegexp.test(query)) {
            query = query.replace(complexRelationRegexp, function (match, relationFunction) {
                return relationFunction;
            });
        }

        return query;
    }

    /**
     * @param variable
     * @returns {string}
     */
    filterVariable(variable) {
        return _.trim(variable, '-');
    };

    /**
     * @param variable
     * @returns {boolean}
     */
    isMinusedVariable(variable) {
        return variable.charAt(0) === '-';
    };

    /**
     * @param triple
     * @returns {string}
     */
    filterTriple(triple) {
        let self = this;
        triple = _.map(self.sparqlFormatter.getTripleParts(triple), function (variable) {
            return self.filterVariable(variable);
        });
        return _.trim(triple.join(' '), '\'');
    };

    /**
     * @param query
     */
    getMinusedVariables(query) {
        return query.match(new RegExp(this.minusedVariablesRegexpCode, 'g'));
    }

    /**
     * Change variable name to label name format
     * E.g.: ?some_variable => ?_some_variable
     *
     * @param variable
     * @returns {string}
     */
    toLabelVariable(variable) {
        return _.replace(variable, '?', '?_');
    }

    /**
     * Translate WSparql to Sparql query
     *
     * @param query
     * @param addSingletonProperties
     * @returns {*}
     */
    toSparql(query, addSingletonProperties = false) {
        let self = this;
        let whereVariablesRegexp = new RegExp(name + '(SELECT)\\s+(.*)\\s+(WHERE)', 'gi');
        _.forEach(self.methods, function(method, name) {
            let methodWhereVariablesGroup = [];
            let regexp = new RegExp(name + '\\((.*)\\)\\.*', 'gi');
            if (regexp.test(query)) {
                query = query.replace(regexp, function (match, methodArguments) {
                    let result = self.methods[name].toSparql.apply(self, methodArguments.split(','));
                    methodWhereVariablesGroup.push(result.whereVariables);
                    return addSingletonProperties === true ?
                        self.sparqlFormatter.addSingletonProperties(result.query, false, '_ws') :
                        result.query;
                });
            }
            _.forEach(methodWhereVariablesGroup, function(methodWhereVariables) {
                query = query.replace(whereVariablesRegexp, function (match, c1, queryVariables, c2) {
                    queryVariables = queryVariables.split(/\s+/);
                    let wherePart = _.uniq(queryVariables.concat(methodWhereVariables)).join(' ');
                    return  c1 + ' ' + wherePart + ' ' + c2;
                });
            });
        });

        console.log('WSparql -> Sparql');
        console.log(query);

        return query;
    }

    /**
     * Translate Sparql to WSparql query
     *
     * @param query
     * @returns {*}
     */
    toWSparql(query) {
        let self = this;

        _.forEach(self.methods, function(method, name) {
            if (self.methods[name].toWsparql) {
                let methodResult = self.methods[name].toWsparql.apply(self, [query]);
                query = methodResult.query;
            }
        });

        let selectVariablesMatch = this.sparqlFormatter.getSelectVariables(query);
        if (selectVariablesMatch) {
            let queryWithoutSelectPart = query.replace(selectVariablesMatch[0], '');
            let bodyVariables = queryWithoutSelectPart.match(new RegExp('[\\w]*[?<$:][\\w:\\/\\.\\-#>]+', 'gmi'));
            let definedVariables = _.intersection(selectVariablesMatch.items, bodyVariables);
            query = query.replace(selectVariablesMatch[1], ' ' + _.trim(definedVariables.join(' '), ' ') + ' ');
        }

        query = query.replace(new RegExp('^\\s*PREFIX.*$', 'gmi'), '');

        query = self.sparqlFormatter.beautify(query);

        console.log('Sparql -> WSparql');
        console.log(query);

        return query;
    }
}
