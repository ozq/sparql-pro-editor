class WSparql {
    constructor() {
        /**
         * Order of methods is important!
         * Some methods generates not clear sparql, but wsparql.
         * E.g., 'wearing' generates query with 'relation' calls, so, 'wearing' must be defined before 'relation'.
         */
        this.methods = {
            wearing: function (triple, postfix) {
                var tripleParts = SparqlFormatter.getTripleParts(triple);
                var relationPart = '';
                var object = tripleParts[2];
                if (_.isUndefined(postfix)) {
                    relationPart = 'relation(' + object + ' crm2:object ' + object + 'Object' + ')\n';
                } else {
                    relationPart = 'OPTIONAL {\n' +
                        'requiredRelation(' + object + ' crm2:object ' + object + 'Object' + ')\n' +
                        postfix + '\n}';
                }
                relationPart += 'relation(' + object + ' crm2:date_from ' + '?dateFrom' + ')\n';
                relationPart += 'relation(' + object + ' crm2:date_to ' + '?dateTo' + ')\n';
                var query = 'OPTIONAL {\n' + triple + '\n' + relationPart + '\n}';
                return {
                    query: query,
                    whereVariables: [tripleParts[2]]
                }
            },
            requiredRelation: function (triple, labelDepth = 1) {
                labelDepth = _.toInteger(labelDepth);
                var tripleParts = SparqlFormatter.getTripleParts(triple);
                var labelPlaceholder = '%labelPlaceholder%';
                var objectLabel = WSparql.toLabelVariable(tripleParts[2]);
                var labelQueryPart = labelPlaceholder;
                var currentLabelQueryPart = '';
                var subject = tripleParts[2];
                for (var i = 1; i <= labelDepth; i++) {
                    var object = i === labelDepth ? objectLabel : tripleParts[2] + '_label_' + i;
                    var currentLabelPlaceholder = i === labelDepth ? '' : labelPlaceholder;
                    currentLabelQueryPart = 'OPTIONAL {\n' + subject + ' rdfs:label ' + object + '.\n' + currentLabelPlaceholder + '\n}';
                    labelQueryPart = _.replace(labelQueryPart, labelPlaceholder, currentLabelQueryPart);
                    subject = object;
                }
                var query = triple + '\n' + labelQueryPart;
                return {
                    query: query,
                    whereVariables: [tripleParts[2], objectLabel]
                }
            },
            relation: function (triple, labelDepth = 1) {
                var base = this.methods.requiredRelation(triple, labelDepth);
                var query = 'OPTIONAL {\n' + base.query + '\n}';
                return {
                    query: query,
                    whereVariables: base.whereVariables
                }
            },
        };
    }

    /**
     * Change variable name
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
                    var result = self.methods[name].apply(self, methodArguments.split(','));
                    methodWhereVariablesGroup.push(result.whereVariables);
                    return addSingletonProperties === true ?
                        sparqlFormatter.addSingletonProperties(result.query, false, '_ws') :
                        result.query;
                });
            }
            _.forEach(methodWhereVariablesGroup, function(methodWhereVariables) {
                query = query.replace(whereVariablesRegexp, function (match, c1, queryVariables, c2) {
                    queryVariables = queryVariables.split(/\s+/);
                    var wherePart = _.uniq(queryVariables.concat(methodWhereVariables)).join(' ').replace('*', '');
                    return  c1 + ' ' + wherePart + ' ' + c2;
                });
            });
        });

        console.log('WSparql -> Sparql');
        console.log(query);

        return query;
    }
}
