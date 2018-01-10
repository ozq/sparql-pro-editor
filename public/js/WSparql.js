class WSparql {
    constructor() {
        this.sf = new SparqlFormatter();

        this.wrgTripleRegexpCode = this.sf.uriRegexpCode + '\\s+' + this.sf.uriRegexpCode + '_wrg' + '\\s+' + this.sf.uriRegexpCode;

        /**
         * Filter variable
         * @param variable
         * @returns {string}
         */
        this.filterVariable = function (variable) {
            return _.trim(variable, '-');
        };

        /**
         * Filter triple
         * @param triple
         * @returns {Array}
         */
        this.filterTriple = function (triple) {
            var self = this;
            triple = _.map(SparqlFormatter.getTripleParts(triple), function (variable) {
                return self.filterVariable(variable);
            });
            return _.trim(triple.join(' '), '\'');
        };

        /**
         * Order of methods is important!
         * Some methods generates not clear sparql, but wsparql.
         * E.g., 'wearing' generates query with 'relation' calls, so, 'wearing' must be defined before 'relation'.
         */
        this.methods = {
            wearing: {
                toSparql: function (triple, postfix) {
                    var tripleParts = SparqlFormatter.getTripleParts(triple);
                    var relationPart = '';
                    var object = this.filterVariable(tripleParts[2]);
                    if (_.isUndefined(postfix)) {
                        relationPart = 'relation(' + object + ' crm2:object ' + object + 'Object' + ')\n';
                    } else {
                        relationPart = 'OPTIONAL {\n' +
                            'requiredRelation(' + object + ' crm2:object ' + object + 'Object' + ')\n' +
                            postfix + '\n}';
                    }
                    relationPart += 'relation(' + object + ' crm2:date_from ' + '?dateFrom' + ')\n';
                    relationPart += 'relation(' + object + ' crm2:date_to ' + '?dateTo' + ')\n';
                    var query = 'OPTIONAL {\n' + this.filterTriple(triple) + '\n' + relationPart + '\n}';
                    return {
                        query: query,
                        whereVariables: tripleParts[2].charAt(0) !== '-' ? [tripleParts[2]] : []
                    }
                }
            },
            requiredRelation: {
                toSparql: function (triple, labelDepth = 1) {
                    labelDepth = _.toInteger(labelDepth);
                    var tripleParts = SparqlFormatter.getTripleParts(triple);
                    var labelPlaceholder = '%labelPlaceholder%';
                    var subject = this.filterVariable(tripleParts[2]);
                    var objectLabel = WSparql.toLabelVariable(subject);
                    var labelQueryPart = labelPlaceholder;
                    var currentLabelQueryPart = '';
                    for (var i = 1; i <= labelDepth; i++) {
                        var object = i === labelDepth ? objectLabel : subject + '_label_' + i;
                        var currentLabelPlaceholder = i === labelDepth ? '' : labelPlaceholder;
                        currentLabelQueryPart = 'OPTIONAL {\n' + subject + ' rdfs:label ' + object + '.\n' + currentLabelPlaceholder + '\n}';
                        labelQueryPart = _.replace(labelQueryPart, labelPlaceholder, currentLabelQueryPart);
                        subject = object;
                    }
                    var query = this.filterTriple(triple) + '\n' + labelQueryPart;

                    return {
                        query: query,
                        whereVariables: tripleParts[2].charAt(0) !== '-' ? [tripleParts[2], objectLabel] : []
                    }
                }
            },
            relation: {
                toSparql: function (triple, labelDepth = 1) {
                    var requiredRelationResult = this.methods.requiredRelation.toSparql.call(this, triple, labelDepth);
                    var query = 'OPTIONAL {\n' + requiredRelationResult.query + '\n}';
                    return {
                        query: query,
                        whereVariables: requiredRelationResult.whereVariables
                    }
                }
            },
            optional: {
                toSparql: function (triple) {
                    var query = 'OPTIONAL {\n' + triple + '\n}';
                    return {
                        query: query,
                        whereVariables: [SparqlFormatter.getTripleParts(triple)[2]]
                    }
                }
            }
        };
    }

    /**
     * Change variable name to "label-like" name
     * E.g.: ?some_variable => ?_some_variable
     * @param variable
     * @returns {string}
     */
    static toLabelVariable(variable) {
        return _.replace(variable, '?', '?_');
    }

    /**
     * Translate WSparql to Sparql query
     * @param query
     * @param addSingletonProperties
     * @returns {*}
     */
    toSparql(query, addSingletonProperties = false) {
        var self = this;
        var whereVariablesRegexp = new RegExp(name + '(SELECT)\\s+(.*)\\s+(WHERE)', 'gi');
        _.forEach(self.methods, function(method, name) {
            var methodWhereVariablesGroup = [];
            var regexp = new RegExp(name + '\\((.*)\\)\\.*', 'gi');
            if (regexp.test(query)) {
                query = query.replace(regexp, function (match, methodArguments) {
                    var result = self.methods[name].toSparql.apply(self, methodArguments.split(','));
                    methodWhereVariablesGroup.push(result.whereVariables);
                    return addSingletonProperties === true ?
                        self.sf.addSingletonProperties(result.query, false, '_ws') :
                        result.query;
                });
            }
            _.forEach(methodWhereVariablesGroup, function(methodWhereVariables) {
                query = query.replace(whereVariablesRegexp, function (match, c1, queryVariables, c2) {
                    queryVariables = queryVariables.split(/\s+/);
                    var wherePart = _.uniq(queryVariables.concat(methodWhereVariables)).join(' ');
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
     * @param query
     * @returns {*}
     */
    toWSparql(query) {
        var self = this;

        //TODO: вынести эти функции в this.methods.{method}.toWSparql методы
        function toRelationFunctions(query) {
            function requiredToRelationFunctions(query) {
                return query.replace(new RegExp('\\s*optional\\s*{\\s*requiredRelation\\((.*)\\)\\s*}', 'gmi'), function (match, triple) {
                    return '\nrelation(' + triple + ')';
                });
            }
            function simplifyRelations(query) {
                var lines = query.split('\n');
                var optionalRegexp = new RegExp('optional\\s*{', 'i');
                var somePartRegexp = new RegExp('\\w+\\s*{', 'i');
                var optionalDepth = 0;
                var inOptionalPart = false;
                var objectData = [];
                var requiredRelationRegexp = new RegExp('requiredRelation\\((.+)\\)', 'i');
                for (var i = 0; i < lines.length; i++) {
                    var currentLine = lines[i];

                    if (optionalRegexp.test(currentLine)) {
                        inOptionalPart = true;
                    } else {
                        if (somePartRegexp.test(currentLine) === true) {
                            inOptionalPart = false;
                        }
                    }

                    if (inOptionalPart) {
                        currentLine.indexOf('{') > -1 ? optionalDepth++ : false;
                        currentLine.indexOf('}') > -1 ? optionalDepth-- : false;
                        if (optionalDepth === 0) {
                            inOptionalPart = false;
                        }
                    }

                    if (self.sf.isTripleLine(currentLine, true)) {
                        objectData[SparqlFormatter.getTripleParts(currentLine)[2]] = {
                            optionalDepth: optionalDepth,
                            lineNumber: i
                        };
                    }

                    if (requiredRelationRegexp.test(currentLine)) {
                        var relationContent = currentLine.match(requiredRelationRegexp)[1];
                        var relationTriple = relationContent.split(', ')[0];
                        var relationSubjectData = objectData[SparqlFormatter.getTripleParts(relationTriple)[0]];
                        if (optionalDepth !== relationSubjectData.optionalDepth) {
                            lines[i] = '';
                            var newRelation = 'relation(' + relationContent + ')';
                            lines.splice(relationSubjectData.lineNumber + 1, 0, newRelation);
                        }
                    }
                }

                query = lines.join('\n');

                var complexRelationRegexp = new RegExp('optional\\s*{\\s*(relation\\(.+\\))\\s+\\}', 'gi');
                while (complexRelationRegexp.test(query)) {
                    query = query.replace(complexRelationRegexp, function (match, relationFunction) {
                        return relationFunction;
                    });
                }

                return query;
            }

            var lines = _.compact(query.split('\n'));
            var lineCount = lines.length;
            var optionalPartRegexp = new RegExp('\s*optional', 'i');
            var tripleData = [];
            var inRootOptionalPart = false;
            var inRootOptionalPartCounter = 0;
            var whereClauseRegexp = new RegExp('where\\s*\\{', 'i');
            var whereClauseFound = false;

            for (var i = 0; i < lineCount; i++) {
                var line = _.trim(lines[i], '. ');
                if (whereClauseRegexp.test(line)) {
                    whereClauseFound = true;
                } else {
                    if (whereClauseFound === true) {
                        if (self.sf.isTripleLine(line)) {
                            var tripleParts = SparqlFormatter.getTripleParts(line);
                            if (self.sf.isLabelUri(tripleParts[1])) {
                                var labelObject = {
                                    triple: line,
                                    line: i,
                                    optionalDepth: inRootOptionalPartCounter,
                                    object: tripleParts[2],
                                    subject: tripleParts[0],
                                };
                                var tripleDataItem = _.find(tripleData, function (data) { return data.object === tripleParts[0]; });
                                if (tripleDataItem) {
                                    var tripleBySubject = _.find(tripleData, function (data) { return data.subject === tripleParts[0]; });
                                    // prevent problem with reversed triples
                                    if (!tripleBySubject) {
                                        tripleDataItem.labels.push(labelObject);
                                    }
                                } else {
                                    var tripleDataItem = _.find(tripleData, function (data) { return _.isEmpty(data.labels) === false && _.last(data.labels).object === tripleParts[0]; });
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

            var selectVariables = [];
            _.forEach(_.uniq(tripleData), function(tripleItem) {
                if (_.isEmpty(tripleItem.labels) === false) {
                    var labelDepth = _.size(tripleItem.labels);
                    lines[tripleItem.line] = '';
                    //TODO: валидировать labelDepth, она должна быть по нарастающей
                    _.forEach(_.uniq(tripleItem.labels), function(labelItem) {
                        lines[labelItem.line] = '';
                    });
                    var functionArgs = [];
                    functionArgs.push(tripleItem.triple);
                    if (labelDepth > 1) {
                        functionArgs.push(labelDepth);
                    }
                    lines[tripleItem.line] = 'requiredRelation(' + functionArgs.join(', ') + ')';
                    selectVariables.push(tripleItem.object);
                }
            });

            query = simplifyRelations(requiredToRelationFunctions(self.sf.replaceEmptyOperators(lines.join('\n'))));

            return {
                query: query,
                selectVariables: _.uniq(selectVariables)
            }
        }
        function toWearingFunctions(query) {
            var lines = _.compact(query.split('\n'));
            var lineCount = lines.length;
            var optionalPartRegexp = new RegExp('\s*optional', 'i');
            var relationFunctionRegexpTemplate = '\\s*relation\\((' + self.sf.uriRegexpCode + ')\\s+' + '(.*' + '[#:]%predicate_postfix%' + ')' + '\\s' + self.sf.uriRegexpCode + '\\)';
            var relationFunctionRegexpCode = '\\s*relation\\((' + self.sf.uriRegexpCode + ')\\s+' + self.sf.uriRegexpCode + '\\s' + self.sf.uriRegexpCode + '\\)';
            var objectRelationRegexpCode = '\\s*requiredRelation\\((' + self.sf.uriRegexpCode + ')\\s+' + '(.*' + '[#:]object' + ')' + '\\s' + '(' + self.sf.uriRegexpCode + ')' + '\\)';
            var wrgTripleRegexp = new RegExp(self.wrgTripleRegexpCode, 'i');
            var emptyLineRegexp = new RegExp('^[\\s}]+$');
            var inOptionalCounter = false;
            var inOptionalPart = false;
            var optionalPartFound = false;
            var wearingData = [];
            var optionalPartStartLineNumber = false;
            var hasSiblings = false;
            var lastFilledItem = false;
            var requiredRelationFound = false;

            for (var i = 0; i < lineCount; i++) {
                var line = _.trim(lines[i], '. ');
                if (optionalPartRegexp.test(line)) {
                    optionalPartFound = true;
                    hasSiblings = false;
                    optionalPartStartLineNumber = i;
                    lastFilledItem = false;
                } else {
                    if (wrgTripleRegexp.test(line)) {
                        var tripleParts = SparqlFormatter.getTripleParts(line);
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
                        var relationFunctionFound = false;

                        var requiredObjectRelationMatch = line.match(new RegExp(objectRelationRegexpCode, 'i'));
                        if (requiredObjectRelationMatch) {
                            var relationSubject = requiredObjectRelationMatch[1];
                            var relationObject = requiredObjectRelationMatch[3];
                            var wearingDataItem = _.find(wearingData, function (data) { return data.object === relationSubject; });
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
                                var regexpCode = relationFunctionRegexpTemplate.replace('%predicate_postfix%', postfix);
                                var relationFunctionMatch = line.match(new RegExp(regexpCode, 'i'));
                                if (relationFunctionMatch) {
                                    var relationSubject = relationFunctionMatch[1];
                                    var wearingDataItem = _.find(wearingData, function (data) { return data.object === relationSubject; });
                                    if (wearingDataItem) {
                                        wearingDataItem.records[postfix] = _.trim(line, '. ');
                                        wearingDataItem.lines.push(i);
                                        lastFilledItem = wearingDataItem;
                                    }
                                    relationFunctionFound = true;
                                }
                            });
                            if (relationFunctionFound === false) {
                                var relationFunctionMatch = line.match(new RegExp(relationFunctionRegexpCode, 'i'));
                                if (relationFunctionMatch) {
                                    var relationSubject = relationFunctionMatch[1];
                                    var wearingDataItem = _.find(wearingData, function (data) { return data.postfixData && data.postfixData.object === relationSubject; });
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

                        //TODO: сделать проверку на пустую строку по нормальному.
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

            var selectVariables = [];
            if (wearingData) {
                _.forEach(wearingData, function(wearingItem) {
                    var isValid = true;
                    _.forEach(wearingItem.records, function(record) {
                        if (record == '') {
                            isValid = false;
                        }
                    });
                    if (isValid === true) {
                        var inputLineNumber = _.min(wearingItem.lines);
                        selectVariables.push(wearingItem.subject);
                        _.forEach(wearingItem.lines, function(lineNumber) {
                            lines[lineNumber] = '';
                        });
                        var postfix = wearingItem.postfixData && wearingItem.postfixData.triple ? wearingItem.postfixData.triple : '';
                        var data = _.compact([wearingItem.triple, postfix]);
                        lines[inputLineNumber] = 'wearing(' + data.join(', ') + ');';
                        if (wearingItem.hasSiblings === false) {
                            if (wearingItem.optionalPartStartLineNumber && wearingItem.optionalPartFinishLineNumber) {
                                lines[wearingItem.optionalPartStartLineNumber] = '';
                                lines[wearingItem.optionalPartFinishLineNumber] = '';
                            }
                        }
                        //TODO: если у нас wearingItem.hasSiblings === false, то зачищаем все строки,
                        //TODO: с wearingItem.optionalPartStartLineNumber по wearingItem.optionalPartFinishLineNumber;
                        //TODO: wearingItem.postfixData.hasSiblings скорее всего не нужен при этом.
                        if (wearingItem.postfixData && wearingItem.postfixData.optionalPartStartLineNumber && wearingItem.postfixData.optionalPartFinishLineNumber) {
                            lines[wearingItem.postfixData.optionalPartStartLineNumber] = '';
                            lines[wearingItem.postfixData.optionalPartFinishLineNumber] = '';
                        }
                    }
                });

                query = lines.join('\n');
            }

            return {
                query: query,
                selectVariables: _.uniq(selectVariables)
            };
        }

        query = toRelationFunctions(query).query;
        query = toWearingFunctions(query).query;

        var selectVariablesMatch = this.sf.getSelectVariables(query);
        if (selectVariablesMatch) {
            var queryWithoutSelectPart = query.replace(selectVariablesMatch[0], '');
            var bodyVariables = queryWithoutSelectPart.match(new RegExp('[\\w]*[?<$:][\\w:\\/\\.\\-#>]+', 'gmi'));
            var definedVariables = _.intersection(selectVariablesMatch.items, bodyVariables);
            query = query.replace(selectVariablesMatch[1], ' ' + _.trim(definedVariables.join(' '), ' ') + ' ');
        }

        query = query.replace(new RegExp('^\\s*PREFIX.*$', 'gmi'), '');

        query = self.sf.beautify(query);

        console.log('Sparql -> WSparql');
        console.log(query);

        return query;
    }
}
